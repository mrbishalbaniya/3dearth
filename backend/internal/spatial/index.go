package spatial

import (
	"math"
)

// GeohashEncode encodes lat/lng to precision (chars). Used for interest cells.
func GeohashEncode(lat, lng float64, precision int) string {
	if precision <= 0 {
		precision = 5
	}
	const base32 = "0123456789bcdefghjkmnpqrstuvwxyz"
	latMin, latMax := -90.0, 90.0
	lngMin, lngMax := -180.0, 180.0
	var hash []byte
	bit := 0
	ch := 0
	even := true
	for len(hash) < precision {
		if even {
			mid := (lngMin + lngMax) / 2
			if lng >= mid {
				ch |= 1 << (4 - bit)
				lngMin = mid
			} else {
				lngMax = mid
			}
		} else {
			mid := (latMin + latMax) / 2
			if lat >= mid {
				ch |= 1 << (4 - bit)
				latMin = mid
			} else {
				latMax = mid
			}
		}
		even = !even
		if bit < 4 {
			bit++
		} else {
			hash = append(hash, base32[ch])
			bit = 0
			ch = 0
		}
	}
	return string(hash)
}

func HaversineM(lat1, lng1, lat2, lng2 float64) float64 {
	const R = 6371000.0
	p1 := lat1 * math.Pi / 180
	p2 := lat2 * math.Pi / 180
	dLat := (lat2 - lat1) * math.Pi / 180
	dLng := (lng2 - lng1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(p1)*math.Cos(p2)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * R * math.Asin(math.Min(1, math.Sqrt(a)))
}

// QuadTree node for in-memory interest management.
type QTItem struct {
	ID  string
	Lat float64
	Lng float64
	Alt float64
}

type QuadTree struct {
	bound  Bounds
	cap    int
	items  []QTItem
	nw, ne, sw, se *QuadTree
	divided bool
}

type Bounds struct {
	MinLat, MaxLat, MinLng, MaxLng float64
}

func NewQuadTree(b Bounds, capacity int) *QuadTree {
	if capacity < 4 {
		capacity = 8
	}
	return &QuadTree{bound: b, cap: capacity}
}

func (b Bounds) Contains(lat, lng float64) bool {
	return lat >= b.MinLat && lat <= b.MaxLat && lng >= b.MinLng && lng <= b.MaxLng
}

func (q *QuadTree) Insert(it QTItem) bool {
	if !q.bound.Contains(it.Lat, it.Lng) {
		return false
	}
	if len(q.items) < q.cap && !q.divided {
		q.items = append(q.items, it)
		return true
	}
	if !q.divided {
		q.subdivide()
	}
	return q.nw.Insert(it) || q.ne.Insert(it) || q.sw.Insert(it) || q.se.Insert(it)
}

func (q *QuadTree) subdivide() {
	latMid := (q.bound.MinLat + q.bound.MaxLat) / 2
	lngMid := (q.bound.MinLng + q.bound.MaxLng) / 2
	q.nw = NewQuadTree(Bounds{latMid, q.bound.MaxLat, q.bound.MinLng, lngMid}, q.cap)
	q.ne = NewQuadTree(Bounds{latMid, q.bound.MaxLat, lngMid, q.bound.MaxLng}, q.cap)
	q.sw = NewQuadTree(Bounds{q.bound.MinLat, latMid, q.bound.MinLng, lngMid}, q.cap)
	q.se = NewQuadTree(Bounds{q.bound.MinLat, latMid, lngMid, q.bound.MaxLng}, q.cap)
	q.divided = true
	for _, it := range q.items {
		_ = q.nw.Insert(it) || q.ne.Insert(it) || q.sw.Insert(it) || q.se.Insert(it)
	}
	q.items = nil
}

func (q *QuadTree) QueryRadius(lat, lng, radiusM float64, out *[]QTItem) {
	// coarse bbox in degrees
	dLat := radiusM / 111320.0
	cos := math.Cos(lat * math.Pi / 180)
	if cos < 0.2 {
		cos = 0.2
	}
	dLng := radiusM / (111320.0 * cos)
	q.queryBox(Bounds{lat - dLat, lat + dLat, lng - dLng, lng + dLng}, lat, lng, radiusM, out)
}

func (q *QuadTree) queryBox(b Bounds, lat, lng, radiusM float64, out *[]QTItem) {
	if q.bound.MaxLat < b.MinLat || q.bound.MinLat > b.MaxLat ||
		q.bound.MaxLng < b.MinLng || q.bound.MinLng > b.MaxLng {
		return
	}
	for _, it := range q.items {
		if HaversineM(lat, lng, it.Lat, it.Lng) <= radiusM {
			*out = append(*out, it)
		}
	}
	if q.divided {
		q.nw.queryBox(b, lat, lng, radiusM, out)
		q.ne.queryBox(b, lat, lng, radiusM, out)
		q.sw.queryBox(b, lat, lng, radiusM, out)
		q.se.queryBox(b, lat, lng, radiusM, out)
	}
}
