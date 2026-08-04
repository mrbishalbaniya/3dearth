/**
 * Sample Kathmandu building data for demo/offline mode
 * This is a small subset of real OSM data for testing when API is unavailable
 */

import type { OSMBuilding, OSMRoad } from "./types";

export const SAMPLE_KATHMANDU_BUILDINGS: OSMBuilding[] = [
  {
    id: 1001,
    type: "way",
    tags: {
      building: "yes",
      name: "Tribhuvan International Airport Terminal",
      "building:levels": "3",
    },
    geometry: [
      { lat: 27.6966, lon: 85.3591 },
      { lat: 27.6970, lon: 85.3591 },
      { lat: 27.6970, lon: 85.3598 },
      { lat: 27.6966, lon: 85.3598 },
      { lat: 27.6966, lon: 85.3591 },
    ],
  },
  {
    id: 1002,
    type: "way",
    tags: {
      building: "temple",
      name: "Pashupatinath Temple",
      "building:levels": "2",
      height: "15",
    },
    geometry: [
      { lat: 27.7106, lon: 85.3485 },
      { lat: 27.7110, lon: 85.3485 },
      { lat: 27.7110, lon: 85.3490 },
      { lat: 27.7106, lon: 85.3490 },
      { lat: 27.7106, lon: 85.3485 },
    ],
  },
  {
    id: 1003,
    type: "way",
    tags: {
      building: "yes",
      name: "Durbar Square Building",
      "building:levels": "4",
    },
    geometry: [
      { lat: 27.7040, lon: 85.3076 },
      { lat: 27.7044, lon: 85.3076 },
      { lat: 27.7044, lon: 85.3082 },
      { lat: 27.7040, lon: 85.3082 },
      { lat: 27.7040, lon: 85.3076 },
    ],
  },
  {
    id: 1004,
    type: "way",
    tags: {
      building: "commercial",
      name: "Thamel Hotel",
      "building:levels": "5",
    },
    geometry: [
      { lat: 27.7145, lon: 85.3120 },
      { lat: 27.7150, lon: 85.3120 },
      { lat: 27.7150, lon: 85.3128 },
      { lat: 27.7145, lon: 85.3128 },
      { lat: 27.7145, lon: 85.3120 },
    ],
  },
  {
    id: 1005,
    type: "way",
    tags: {
      building: "stupa",
      name: "Swayambhunath Stupa",
      "building:levels": "2",
      height: "20",
    },
    geometry: [
      { lat: 27.7149, lon: 85.2903 },
      { lat: 27.7153, lon: 85.2903 },
      { lat: 27.7153, lon: 85.2908 },
      { lat: 27.7149, lon: 85.2908 },
      { lat: 27.7149, lon: 85.2903 },
    ],
  },
  // Add more sample buildings around city center
  {
    id: 1006,
    type: "way",
    tags: { building: "residential", "building:levels": "3" },
    geometry: [
      { lat: 27.7000, lon: 85.3200 },
      { lat: 27.7003, lon: 85.3200 },
      { lat: 27.7003, lon: 85.3205 },
      { lat: 27.7000, lon: 85.3205 },
      { lat: 27.7000, lon: 85.3200 },
    ],
  },
  {
    id: 1007,
    type: "way",
    tags: { building: "commercial", "building:levels": "4" },
    geometry: [
      { lat: 27.7010, lon: 85.3210 },
      { lat: 27.7014, lon: 85.3210 },
      { lat: 27.7014, lon: 85.3216 },
      { lat: 27.7010, lon: 85.3216 },
      { lat: 27.7010, lon: 85.3210 },
    ],
  },
  {
    id: 1008,
    type: "way",
    tags: { building: "yes", "building:levels": "2" },
    geometry: [
      { lat: 27.7020, lon: 85.3220 },
      { lat: 27.7023, lon: 85.3220 },
      { lat: 27.7023, lon: 85.3224 },
      { lat: 27.7020, lon: 85.3224 },
      { lat: 27.7020, lon: 85.3220 },
    ],
  },
];

export const SAMPLE_KATHMANDU_ROADS: OSMRoad[] = [
  {
    id: 2001,
    type: "way",
    tags: {
      highway: "primary",
      name: "Ring Road",
    },
    geometry: [
      { lat: 27.6966, lon: 85.3591 },
      { lat: 27.7000, lon: 85.3500 },
      { lat: 27.7050, lon: 85.3400 },
      { lat: 27.7100, lon: 85.3300 },
    ],
  },
  {
    id: 2002,
    type: "way",
    tags: {
      highway: "secondary",
      name: "Thamel Street",
    },
    geometry: [
      { lat: 27.7145, lon: 85.3120 },
      { lat: 27.7160, lon: 85.3140 },
      { lat: 27.7170, lon: 85.3160 },
    ],
  },
  {
    id: 2003,
    type: "way",
    tags: {
      highway: "tertiary",
      name: "Durbar Road",
    },
    geometry: [
      { lat: 27.7040, lon: 85.3076 },
      { lat: 27.7050, lon: 85.3090 },
      { lat: 27.7060, lon: 85.3100 },
    ],
  },
];
