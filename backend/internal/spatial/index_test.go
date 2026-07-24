package spatial_test

import (
	"testing"

	"github.com/mrbishalbaniya/3dearth/backend/internal/spatial"
)

func TestQuadTreeRadius(t *testing.T) {
	qt := spatial.NewQuadTree(spatial.Bounds{-90, 90, -180, 180}, 4)
	_ = qt.Insert(spatial.QTItem{ID: "a", Lat: 27.7, Lng: 85.3})
	_ = qt.Insert(spatial.QTItem{ID: "b", Lat: 27.71, Lng: 85.31})
	_ = qt.Insert(spatial.QTItem{ID: "c", Lat: 40.0, Lng: -74.0})
	var out []spatial.QTItem
	qt.QueryRadius(27.7, 85.3, 5000, &out)
	if len(out) < 2 {
		t.Fatalf("expected local aircraft, got %d", len(out))
	}
}

func TestGeohash(t *testing.T) {
	h := spatial.GeohashEncode(27.7, 85.3, 5)
	if len(h) != 5 {
		t.Fatalf("hash %q", h)
	}
}
