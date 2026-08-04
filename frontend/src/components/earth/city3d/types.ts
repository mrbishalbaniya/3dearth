/**
 * 3D City Map Types
 * Based on map3d by cartesiancs - MIT License
 * https://github.com/cartesiancs/map3d
 */

export interface OSMNode {
  lat: number;
  lon: number;
}

export interface OSMTags {
  name?: string;
  building?: string;
  height?: string;
  "building:levels"?: string;
  amenity?: string;
  denomination?: string;
  "addr:street"?: string;
  "addr:housenumber"?: string;
  "addr:district"?: string;
  "addr:city"?: string;
  "addr:postcode"?: string;
  [key: string]: string | undefined;
}

export interface OSMBuilding {
  id: number;
  type: "way" | "relation";
  tags: OSMTags;
  geometry?: OSMNode[];
}

export interface OSMRoad {
  id: number;
  type: "way";
  tags: {
    highway: string;
    name?: string;
    [key: string]: string | undefined;
  };
  geometry: OSMNode[];
}

export interface OSMResponse {
  version: number;
  generator: string;
  elements: (OSMBuilding | OSMRoad)[];
}

export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface City3DConfig {
  bounds: GeoBounds;
  defaultHeight?: number;
  levelHeight?: number;
  buildingColor?: string;
  roadColor?: string;
  scale?: number;
}
