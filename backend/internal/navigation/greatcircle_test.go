package navigation_test

import (
	"testing"

	"github.com/mrbishalbaniya/3dearth/backend/internal/domain"
	"github.com/mrbishalbaniya/3dearth/backend/internal/navigation"
)

func TestHaversineKathmanduLondon(t *testing.T) {
	a := domain.GeoPoint{Lat: 27.6966, Lng: 85.3591}
	b := domain.GeoPoint{Lat: 51.47, Lng: -0.4619}
	nm := navigation.HaversineNm(a, b)
	if nm < 3800 || nm > 4200 {
		t.Fatalf("unexpected distance %.1f nm", nm)
	}
}

func TestGreatCircleWaypoints(t *testing.T) {
	a := domain.GeoPoint{Lat: 27.7, Lng: 85.3}
	b := domain.GeoPoint{Lat: 40.6, Lng: -73.8}
	r := navigation.GreatCircle(a, b, 16, 230)
	if len(r.Waypoints) != 17 {
		t.Fatalf("waypoints %d", len(r.Waypoints))
	}
	if r.DistanceNm < 6000 {
		t.Fatalf("distance too small %.1f", r.DistanceNm)
	}
	if r.ETESec == nil || *r.ETESec < 1000 {
		t.Fatalf("ete missing")
	}
}

func BenchmarkGreatCircle(b *testing.B) {
	a := domain.GeoPoint{Lat: 0, Lng: 0}
	c := domain.GeoPoint{Lat: 45, Lng: 45}
	for i := 0; i < b.N; i++ {
		_ = navigation.GreatCircle(a, c, 24, 200)
	}
}
