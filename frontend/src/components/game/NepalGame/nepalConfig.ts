/**
 * Nepal Game Configuration
 * Geographic bounds, cities, mountains, and game challenges
 */

export const NEPAL_BOUNDS = {
  center: { lat: 28.3949, lng: 84.1240 },
  north: 30.4168,
  south: 26.3976,
  east: 88.1434,
  west: 80.0883,
};

export const NEPAL_CAMERA_CONFIG = {
  defaultAltitude: 250_000, // meters - good overview of Nepal
  minAltitude: 100, // meters - street level
  maxAltitude: 1_000_000, // meters - max zoom out
  defaultPosition: {
    lat: 28.3949,
    lng: 84.1240,
    altitude: 250_000,
  },
};

export interface NepalCity {
  id: string;
  name: string;
  nameNe: string;
  lat: number;
  lng: number;
  elevationM: number;
  population: number;
  type: "capital" | "city";
  description: string;
}

export interface NepalMountain {
  id: string;
  name: string;
  nameNe: string;
  lat: number;
  lng: number;
  elevationM: number;
  rank: number;
  range: string;
  difficulty: "moderate" | "high" | "very_high" | "extreme";
}

export const NEPAL_CITIES: NepalCity[] = [
  {
    id: "ktm",
    name: "Kathmandu",
    nameNe: "काठमाडौं",
    lat: 27.7172,
    lng: 85.3240,
    elevationM: 1400,
    population: 1442271,
    type: "capital",
    description: "Capital and largest city",
  },
  {
    id: "pkr",
    name: "Pokhara",
    nameNe: "पोखरा",
    lat: 28.2096,
    lng: 83.9856,
    elevationM: 827,
    population: 518452,
    type: "city",
    description: "Gateway to Annapurna",
  },
  {
    id: "ltp",
    name: "Lalitpur",
    nameNe: "ललितपुर",
    lat: 27.6588,
    lng: 85.3206,
    elevationM: 1400,
    population: 284922,
    type: "city",
    description: "City of Fine Arts",
  },
  {
    id: "brt",
    name: "Bharatpur",
    nameNe: "भरतपुर",
    lat: 27.6768,
    lng: 84.4377,
    elevationM: 208,
    population: 280502,
    type: "city",
    description: "Metropolitan city",
  },
  {
    id: "bir",
    name: "Biratnagar",
    nameNe: "विराटनगर",
    lat: 26.4525,
    lng: 87.2718,
    elevationM: 72,
    population: 242192,
    type: "city",
    description: "Industrial hub",
  },
];

export const NEPAL_MOUNTAINS: NepalMountain[] = [
  {
    id: "everest",
    name: "Mount Everest",
    nameNe: "सगरमाथा",
    lat: 27.9881,
    lng: 86.9250,
    elevationM: 8848.86,
    rank: 1,
    range: "Mahalangur Himal",
    difficulty: "extreme",
  },
  {
    id: "kanchenjunga",
    name: "Kanchenjunga",
    nameNe: "कञ्चनजङ्घा",
    lat: 27.7025,
    lng: 88.1475,
    elevationM: 8586,
    rank: 3,
    range: "Kanchenjunga Himal",
    difficulty: "extreme",
  },
  {
    id: "lhotse",
    name: "Lhotse",
    nameNe: "ल्होत्से",
    lat: 27.9617,
    lng: 86.9333,
    elevationM: 8516,
    rank: 4,
    range: "Mahalangur Himal",
    difficulty: "extreme",
  },
  {
    id: "makalu",
    name: "Makalu",
    nameNe: "मकालु",
    lat: 27.8892,
    lng: 87.0886,
    elevationM: 8485,
    rank: 5,
    range: "Mahalangur Himal",
    difficulty: "extreme",
  },
  {
    id: "cho-oyu",
    name: "Cho Oyu",
    nameNe: "चोयु",
    lat: 28.0942,
    lng: 86.6608,
    elevationM: 8188,
    rank: 6,
    range: "Mahalangur Himal",
    difficulty: "very_high",
  },
  {
    id: "dhaulagiri",
    name: "Dhaulagiri",
    nameNe: "धौलागिरी",
    lat: 28.6974,
    lng: 83.4930,
    elevationM: 8167,
    rank: 7,
    range: "Dhaulagiri Himal",
    difficulty: "extreme",
  },
  {
    id: "manaslu",
    name: "Manaslu",
    nameNe: "मनास्लु",
    lat: 28.5497,
    lng: 84.5597,
    elevationM: 8163,
    rank: 8,
    range: "Mansiri Himal",
    difficulty: "very_high",
  },
  {
    id: "annapurna",
    name: "Annapurna I",
    nameNe: "अन्नपूर्णा",
    lat: 28.5956,
    lng: 83.8203,
    elevationM: 8091,
    rank: 10,
    range: "Annapurna Himal",
    difficulty: "extreme",
  },
];

export type NepalGameMode = "explore" | "city_finder" | "mountain_challenge" | "flight_tour";

export interface NepalGameChallenge {
  id: string;
  title: string;
  titleNe: string;
  description: string;
  type: "find_city" | "find_mountain" | "fly_route" | "identify_landmark";
  target: string; // city id or mountain id
  difficulty: "easy" | "medium" | "hard";
  points: number;
  timeLimit?: number; // seconds
}

export const NEPAL_CHALLENGES: NepalGameChallenge[] = [
  {
    id: "find-kathmandu",
    title: "Find Kathmandu",
    titleNe: "काठमाडौं खोज्नुहोस्",
    description: "Locate Nepal's capital city",
    type: "find_city",
    target: "ktm",
    difficulty: "easy",
    points: 100,
    timeLimit: 60,
  },
  {
    id: "find-everest",
    title: "Find Mount Everest",
    titleNe: "सगरमाथा खोज्नुहोस्",
    description: "Locate the world's highest peak",
    type: "find_mountain",
    target: "everest",
    difficulty: "medium",
    points: 200,
    timeLimit: 90,
  },
  {
    id: "find-pokhara",
    title: "Find Pokhara",
    titleNe: "पोखरा खोज्नुहोस्",
    description: "Locate the gateway to Annapurna",
    type: "find_city",
    target: "pkr",
    difficulty: "medium",
    points: 150,
    timeLimit: 75,
  },
  {
    id: "identify-eight-thousanders",
    title: "Identify the 8000ers",
    titleNe: "८०००+ मिटरका हिमाल पहिचान गर्नुहोस्",
    description: "Find all 8 of Nepal's 8000m+ peaks",
    type: "identify_landmark",
    target: "mountains-8000",
    difficulty: "hard",
    points: 500,
    timeLimit: 300,
  },
  {
    id: "ktm-to-pkr-flight",
    title: "Kathmandu to Pokhara Flight",
    titleNe: "काठमाडौं देखि पोखरा उडान",
    description: "Fly from Kathmandu to Pokhara",
    type: "fly_route",
    target: "ktm-pkr",
    difficulty: "medium",
    points: 300,
  },
];

export interface NepalGameState {
  mode: NepalGameMode;
  currentChallenge: NepalGameChallenge | null;
  score: number;
  challengesCompleted: string[];
  citiesFound: string[];
  mountainsFound: string[];
  totalDistance: number; // km
  totalFlightTime: number; // seconds
}

export const INITIAL_NEPAL_GAME_STATE: NepalGameState = {
  mode: "explore",
  currentChallenge: null,
  score: 0,
  challengesCompleted: [],
  citiesFound: [],
  mountainsFound: [],
  totalDistance: 0,
  totalFlightTime: 0,
};
