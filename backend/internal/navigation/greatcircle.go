package navigation

import (
	"math"

	"github.com/mrbishalbaniya/3dearth/backend/internal/domain"
)

const earthRadiusNm = 3440.065

type RouteResult struct {
	DistanceNm float64           `json:"distanceNm"`
	BearingDeg float64           `json:"bearingDeg"`
	ETESec     *int              `json:"eteSec,omitempty"`
	Waypoints  []domain.GeoPoint `json:"waypoints"`
}

func HaversineNm(a, b domain.GeoPoint) float64 {
	p1 := a.Lat * math.Pi / 180
	p2 := b.Lat * math.Pi / 180
	dLat := (b.Lat - a.Lat) * math.Pi / 180
	dLng := (b.Lng - a.Lng) * math.Pi / 180
	h := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(p1)*math.Cos(p2)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * earthRadiusNm * math.Asin(math.Min(1, math.Sqrt(h)))
}

func InitialBearingDeg(a, b domain.GeoPoint) float64 {
	p1 := a.Lat * math.Pi / 180
	p2 := b.Lat * math.Pi / 180
	dLng := (b.Lng - a.Lng) * math.Pi / 180
	y := math.Sin(dLng) * math.Cos(p2)
	x := math.Cos(p1)*math.Sin(p2) - math.Sin(p1)*math.Cos(p2)*math.Cos(dLng)
	brg := math.Atan2(y, x) * 180 / math.Pi
	return math.Mod(brg+360, 360)
}

func GreatCircle(a, b domain.GeoPoint, steps int, cruiseSpeedMs float64) RouteResult {
	if steps < 2 {
		steps = 16
	}
	// Spherical SLERP via ECEF
	φ1, λ1 := a.Lat*math.Pi/180, a.Lng*math.Pi/180
	φ2, λ2 := b.Lat*math.Pi/180, b.Lng*math.Pi/180
	x1, y1, z1 := math.Cos(φ1)*math.Cos(λ1), math.Cos(φ1)*math.Sin(λ1), math.Sin(φ1)
	x2, y2, z2 := math.Cos(φ2)*math.Cos(λ2), math.Cos(φ2)*math.Sin(λ2), math.Sin(φ2)
	d := math.Acos(math.Max(-1, math.Min(1, x1*x2+y1*y2+z1*z2)))
	wps := make([]domain.GeoPoint, 0, steps+1)
	if d < 1e-9 {
		for i := 0; i <= steps; i++ {
			wps = append(wps, a)
		}
	} else {
		sinD := math.Sin(d)
		for i := 0; i <= steps; i++ {
			f := float64(i) / float64(steps)
			A := math.Sin((1-f)*d) / sinD
			B := math.Sin(f*d) / sinD
			x, y, z := A*x1+B*x2, A*y1+B*y2, A*z1+B*z2
			φ := math.Atan2(z, math.Hypot(x, y))
			λ := math.Atan2(y, x)
			wps = append(wps, domain.GeoPoint{Lat: φ * 180 / math.Pi, Lng: λ * 180 / math.Pi})
		}
	}
	dist := HaversineNm(a, b)
	res := RouteResult{
		DistanceNm: dist,
		BearingDeg: InitialBearingDeg(a, b),
		Waypoints:  wps,
	}
	if cruiseSpeedMs > 1 {
		kt := cruiseSpeedMs * 1.94384
		sec := int((dist / kt) * 3600)
		res.ETESec = &sec
	}
	return res
}

func FuelEstimateKg(distanceNm, burnKgPerHour, reserveKg float64) float64 {
	hours := distanceNm / 120 // fallback 120 kt average if unknown
	if hours < 0.1 {
		hours = 0.1
	}
	return burnKgPerHour*hours*0.85 + reserveKg
}
