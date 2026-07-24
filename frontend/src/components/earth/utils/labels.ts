/** Curated place labels for zoom-aware fading (no overlap via priority). */

export type LabelKind =
  | "continent"
  | "country"
  | "province"
  | "city"
  | "street"
  | "building";

export interface MapLabel {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: LabelKind;
  priority: number;
  minLevel: number;
  maxLevel: number;
}

export const MAP_LABELS: MapLabel[] = [
  // Continents
  { id: "c-na", name: "North America", lat: 45, lng: -100, kind: "continent", priority: 10, minLevel: 1, maxLevel: 2 },
  { id: "c-sa", name: "South America", lat: -15, lng: -60, kind: "continent", priority: 10, minLevel: 1, maxLevel: 2 },
  { id: "c-eu", name: "Europe", lat: 50, lng: 15, kind: "continent", priority: 10, minLevel: 1, maxLevel: 2 },
  { id: "c-af", name: "Africa", lat: 5, lng: 20, kind: "continent", priority: 10, minLevel: 1, maxLevel: 2 },
  { id: "c-as", name: "Asia", lat: 40, lng: 90, kind: "continent", priority: 10, minLevel: 1, maxLevel: 2 },
  { id: "c-oc", name: "Oceania", lat: -25, lng: 135, kind: "continent", priority: 10, minLevel: 1, maxLevel: 2 },

  // Countries
  { id: "us", name: "United States", lat: 39.8, lng: -98.5, kind: "country", priority: 8, minLevel: 2, maxLevel: 3 },
  { id: "ca", name: "Canada", lat: 56, lng: -106, kind: "country", priority: 8, minLevel: 2, maxLevel: 3 },
  { id: "br", name: "Brazil", lat: -10, lng: -55, kind: "country", priority: 8, minLevel: 2, maxLevel: 3 },
  { id: "gb", name: "United Kingdom", lat: 54, lng: -2, kind: "country", priority: 8, minLevel: 2, maxLevel: 3 },
  { id: "fr", name: "France", lat: 46.5, lng: 2.5, kind: "country", priority: 8, minLevel: 2, maxLevel: 3 },
  { id: "de", name: "Germany", lat: 51.2, lng: 10.4, kind: "country", priority: 8, minLevel: 2, maxLevel: 3 },
  { id: "in", name: "India", lat: 22, lng: 79, kind: "country", priority: 8, minLevel: 2, maxLevel: 3 },
  { id: "cn", name: "China", lat: 35, lng: 105, kind: "country", priority: 8, minLevel: 2, maxLevel: 3 },
  { id: "jp", name: "Japan", lat: 36.2, lng: 138.3, kind: "country", priority: 8, minLevel: 2, maxLevel: 3 },
  { id: "au", name: "Australia", lat: -25, lng: 134, kind: "country", priority: 8, minLevel: 2, maxLevel: 3 },
  { id: "za", name: "South Africa", lat: -29, lng: 25, kind: "country", priority: 7, minLevel: 2, maxLevel: 3 },
  { id: "eg", name: "Egypt", lat: 26.8, lng: 30.8, kind: "country", priority: 7, minLevel: 2, maxLevel: 3 },
  { id: "mx", name: "Mexico", lat: 23.6, lng: -102.5, kind: "country", priority: 7, minLevel: 2, maxLevel: 3 },
  { id: "ru", name: "Russia", lat: 60, lng: 100, kind: "country", priority: 8, minLevel: 2, maxLevel: 3 },
  { id: "np", name: "Nepal", lat: 28.4, lng: 84.1, kind: "country", priority: 7, minLevel: 2, maxLevel: 4 },

  // Provinces / states
  { id: "ca-on", name: "Ontario", lat: 50.5, lng: -86, kind: "province", priority: 5, minLevel: 4, maxLevel: 5 },
  { id: "us-ca", name: "California", lat: 37.2, lng: -119.5, kind: "province", priority: 5, minLevel: 4, maxLevel: 5 },
  { id: "us-ny", name: "New York", lat: 42.9, lng: -75.5, kind: "province", priority: 5, minLevel: 4, maxLevel: 5 },
  { id: "us-tx", name: "Texas", lat: 31.5, lng: -99.3, kind: "province", priority: 5, minLevel: 4, maxLevel: 5 },
  { id: "in-mh", name: "Maharashtra", lat: 19.5, lng: 76, kind: "province", priority: 5, minLevel: 4, maxLevel: 5 },
  { id: "au-nsw", name: "New South Wales", lat: -32.5, lng: 147, kind: "province", priority: 5, minLevel: 4, maxLevel: 5 },

  // Cities
  { id: "nyc", name: "New York", lat: 40.7128, lng: -74.006, kind: "city", priority: 9, minLevel: 3, maxLevel: 6 },
  { id: "lon", name: "London", lat: 51.5074, lng: -0.1278, kind: "city", priority: 9, minLevel: 3, maxLevel: 6 },
  { id: "tok", name: "Tokyo", lat: 35.6762, lng: 139.6503, kind: "city", priority: 9, minLevel: 3, maxLevel: 6 },
  { id: "par", name: "Paris", lat: 48.8566, lng: 2.3522, kind: "city", priority: 9, minLevel: 3, maxLevel: 6 },
  { id: "syd", name: "Sydney", lat: -33.8688, lng: 151.2093, kind: "city", priority: 8, minLevel: 3, maxLevel: 6 },
  { id: "dxb", name: "Dubai", lat: 25.2048, lng: 55.2708, kind: "city", priority: 8, minLevel: 3, maxLevel: 6 },
  { id: "sin", name: "Singapore", lat: 1.3521, lng: 103.8198, kind: "city", priority: 8, minLevel: 3, maxLevel: 6 },
  { id: "mum", name: "Mumbai", lat: 19.076, lng: 72.8777, kind: "city", priority: 8, minLevel: 3, maxLevel: 6 },
  { id: "ktm", name: "Kathmandu", lat: 27.7172, lng: 85.324, kind: "city", priority: 8, minLevel: 3, maxLevel: 6 },
  { id: "sao", name: "São Paulo", lat: -23.5505, lng: -46.6333, kind: "city", priority: 8, minLevel: 3, maxLevel: 6 },
  { id: "cai", name: "Cairo", lat: 30.0444, lng: 31.2357, kind: "city", priority: 7, minLevel: 3, maxLevel: 6 },
  { id: "ber", name: "Berlin", lat: 52.52, lng: 13.405, kind: "city", priority: 7, minLevel: 3, maxLevel: 6 },
  { id: "la", name: "Los Angeles", lat: 34.0522, lng: -118.2437, kind: "city", priority: 8, minLevel: 3, maxLevel: 6 },
  { id: "chi", name: "Chicago", lat: 41.8781, lng: -87.6298, kind: "city", priority: 7, minLevel: 3, maxLevel: 6 },
  { id: "sei", name: "Seoul", lat: 37.5665, lng: 126.978, kind: "city", priority: 8, minLevel: 3, maxLevel: 6 },

  // Sample street / neighborhood labels (activate near major cities)
  { id: "st-5th", name: "5th Avenue", lat: 40.774, lng: -73.965, kind: "street", priority: 3, minLevel: 6, maxLevel: 7 },
  { id: "st-broadway", name: "Broadway", lat: 40.758, lng: -73.985, kind: "street", priority: 3, minLevel: 6, maxLevel: 7 },
  { id: "st-oxford", name: "Oxford Street", lat: 51.5154, lng: -0.1419, kind: "street", priority: 3, minLevel: 6, maxLevel: 7 },
  { id: "st-champs", name: "Champs-Élysées", lat: 48.8698, lng: 2.3075, kind: "street", priority: 3, minLevel: 6, maxLevel: 7 },
  { id: "st-shibuya", name: "Shibuya Crossing", lat: 35.6595, lng: 139.7004, kind: "street", priority: 3, minLevel: 6, maxLevel: 7 },
  { id: "st-durbar", name: "Durbar Marg", lat: 27.712, lng: 85.317, kind: "street", priority: 3, minLevel: 6, maxLevel: 7 },
];
