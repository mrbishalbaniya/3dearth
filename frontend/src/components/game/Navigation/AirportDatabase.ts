/**
 * Nepal Airport Database
 * Comprehensive database of all Nepal civil airports, STOL strips, and heliports.
 * Sources: CAAN AIP Nepal 2024, ICAO Doc 7910.
 */

import type { NepalAirportExtended, NepalRunway, AirportFrequency, InstrumentApproach } from "./NavigationTypes";

// ─── Internal build helpers ──────────────────────────────────────────────────

function rwy(
  id: string,
  hdg: number,
  len: number,
  wid = 30,
  surface: NepalRunway["surface"] = "asphalt",
): NepalRunway {
  return { id, headingDeg: hdg, lengthM: len, widthM: wid, surface };
}

function freq(type: AirportFrequency["type"], name: string, mhz: number): AirportFrequency {
  return { type, name, mhz };
}

function approach(
  type: InstrumentApproach["type"],
  rwyId: string,
  mdaM: number,
  visM: number,
  navId?: string,
): InstrumentApproach {
  return { type, runwayId: rwyId, mdaAltM: mdaM, visibilityM: visM, navaidId: navId };
}

// ─── Nepal Airport Records ────────────────────────────────────────────────────

const NEPAL_AIRPORTS_RAW: NepalAirportExtended[] = [
  // ── VNKT – Tribhuvan International ─────────────────────────────────────────
  {
    icao: "VNKT", iata: "KTM",
    name: "Tribhuvan International Airport",
    nameNepali: "त्रिभुवन अन्तर्राष्ट्रिय विमानस्थल",
    city: "Kathmandu", province: "Bagmati",
    lat: 27.6966, lng: 85.3591, elevM: 1338,
    longestRunwayM: 3054, surfaceType: "paved",
    category: "international", caanCode: "VNKT", active: true,
    runways: [
      { ...rwy("02", 20, 3054, 45), elevM: 1338, lightingPapi: true,
        ils: { locFreqMhz: 111.9, courseDeg: 22, gsAngleDeg: 3.0 } },
    ],
    frequencies: [
      freq("ATIS", "Kathmandu ATIS", 126.25),
      freq("CLEARANCE", "Kathmandu Delivery", 128.10),
      freq("GND", "Kathmandu Ground", 121.90),
      freq("TWR", "Kathmandu Tower", 118.10),
      freq("APP", "Kathmandu Approach", 119.10),
      freq("APP", "Kathmandu Approach (Radar)", 124.30),
      freq("CTR", "Kathmandu Control", 125.10),
    ],
    approaches: [
      { type: "ILS", runwayId: "02", mdaAltM: 1486, daAltM: 1448, visibilityM: 550,
        navaidId: "KTM_ILS_02" },
      approach("RNAV_GNSS", "02", 1448, 800, "RNAV_KTM_02"),
      approach("VOR", "02", 1600, 1600, "KTM"),
      approach("VOR", "20", 1700, 3200, "KTM"),
    ],
    parkingPositions: [
      { id: "G1", lat: 27.6981, lng: 85.3571, headingDeg: 200, type: "gate" },
      { id: "G2", lat: 27.6979, lng: 85.3575, headingDeg: 200, type: "gate" },
      { id: "G3", lat: 27.6977, lng: 85.3579, headingDeg: 200, type: "gate" },
      { id: "R1", lat: 27.6970, lng: 85.3560, headingDeg: 90, type: "remote" },
      { id: "GA1", lat: 27.6960, lng: 85.3610, headingDeg: 0, type: "ga" },
    ],
  },
  // ── VNPK – Pokhara International ────────────────────────────────────────────
  {
    icao: "VNPK", iata: "PKR",
    name: "Pokhara International Airport",
    nameNepali: "पोखरा अन्तर्राष्ट्रिय विमानस्थल",
    city: "Pokhara", province: "Gandaki",
    lat: 28.1865, lng: 83.9820, elevM: 823,
    longestRunwayM: 2500, surfaceType: "paved",
    category: "international", caanCode: "VNPK", active: true,
    runways: [
      { ...rwy("12", 120, 2500, 45), lightingPapi: true, elevM: 823 },
      { ...rwy("30", 300, 2500, 45), elevM: 823 },
    ],
    frequencies: [
      freq("ATIS", "Pokhara ATIS", 127.70),
      freq("GND", "Pokhara Ground", 121.70),
      freq("TWR", "Pokhara Tower", 118.30),
      freq("APP", "Pokhara Approach", 119.90),
    ],
    approaches: [
      approach("RNAV_GNSS", "12", 930, 1600, "RNAV_PKR_12"),
      approach("VOR", "12", 1100, 3200, "PKR"),
    ],
    parkingPositions: [
      { id: "G1", lat: 28.1870, lng: 83.9800, headingDeg: 120, type: "gate" },
      { id: "GA1", lat: 28.1860, lng: 83.9840, headingDeg: 0, type: "ga" },
    ],
  },
  // ── VNBW – Gautam Buddha International ─────────────────────────────────────
  {
    icao: "VNBW", iata: "BWA",
    name: "Gautam Buddha International Airport",
    nameNepali: "गौतम बुद्ध अन्तर्राष्ट्रिय विमानस्थल",
    city: "Bhairahawa", province: "Lumbini",
    lat: 27.5057, lng: 83.4163, elevM: 109,
    longestRunwayM: 3000, surfaceType: "paved",
    category: "international", caanCode: "VNBW", active: true,
    runways: [
      { ...rwy("10", 100, 3000, 45), lightingPapi: true, elevM: 109 },
      { ...rwy("28", 280, 3000, 45), elevM: 109 },
    ],
    frequencies: [
      freq("TWR", "Bhairahawa Tower", 118.10),
      freq("APP", "Bhairahawa Approach", 120.50),
      freq("GND", "Bhairahawa Ground", 121.60),
    ],
    approaches: [
      approach("RNAV_GNSS", "10", 200, 1200, "RNAV_BWA_10"),
      approach("VOR", "10", 300, 2400, "BHR"),
    ],
    parkingPositions: [
      { id: "G1", lat: 27.5062, lng: 83.4155, headingDeg: 100, type: "gate" },
    ],
  },
  // ── VNVT – Biratnagar ───────────────────────────────────────────────────────
  {
    icao: "VNVT", iata: "BIR",
    name: "Biratnagar Airport",
    nameNepali: "विराटनगर विमानस्थल",
    city: "Biratnagar", province: "Koshi",
    lat: 26.4814, lng: 87.2640, elevM: 72,
    longestRunwayM: 1524, surfaceType: "paved",
    category: "domestic", caanCode: "VNVT", active: true,
    runways: [
      { ...rwy("11", 110, 1524, 30), lightingPapi: true, elevM: 72 },
      { ...rwy("29", 290, 1524, 30), elevM: 72 },
    ],
    frequencies: [
      freq("TWR", "Biratnagar Tower", 118.50),
      freq("APP", "Biratnagar Approach", 121.50),
    ],
    approaches: [
      approach("RNAV_GNSS", "11", 200, 2400, "RNAV_BIR_11"),
      approach("NDB", "11", 300, 3200, "BIR"),
    ],
    parkingPositions: [
      { id: "R1", lat: 26.4820, lng: 87.2630, headingDeg: 110, type: "remote" },
    ],
  },
  // ── VNJP – Janakpur ─────────────────────────────────────────────────────────
  {
    icao: "VNJP", iata: "JKR",
    name: "Janakpur Airport",
    nameNepali: "जनकपुर विमानस्थल",
    city: "Janakpur", province: "Madhesh",
    lat: 26.7088, lng: 85.9223, elevM: 78,
    longestRunwayM: 1006, surfaceType: "paved",
    category: "domestic", caanCode: "VNJP", active: true,
    runways: [
      { ...rwy("09", 90, 1006, 30, "asphalt"), elevM: 78 },
      { ...rwy("27", 270, 1006, 30, "asphalt"), elevM: 78 },
    ],
    frequencies: [
      freq("TWR", "Janakpur Tower", 118.70),
    ],
    approaches: [
      approach("NDB", "09", 250, 4800, "JKR"),
    ],
    parkingPositions: [
      { id: "R1", lat: 26.7092, lng: 85.9215, headingDeg: 90, type: "remote" },
    ],
  },
  // ── VNLT – Lukla (Tenzing-Hillary) ──────────────────────────────────────────
  {
    icao: "VNLT", iata: "LUA",
    name: "Tenzing-Hillary Airport",
    nameNepali: "तेन्जिङ हिलारी विमानस्थल",
    city: "Lukla", province: "Koshi",
    lat: 27.6868, lng: 86.7314, elevM: 2845,
    longestRunwayM: 527, surfaceType: "paved",
    category: "stol", caanCode: "VNLT", active: true,
    terrainWarning: "One-way circuit – uphill runway. Severe mountain terrain surrounds all quadrants.",
    runways: [
      { ...rwy("06", 60, 527, 20, "asphalt"), elevM: 2860, lightingPapi: false },
    ],
    frequencies: [
      freq("UNICOM", "Lukla Radio", 122.50),
    ],
    approaches: [
      approach("VISUAL", "06", 2900, 5000),
    ],
    parkingPositions: [
      { id: "R1", lat: 27.6872, lng: 86.7310, headingDeg: 60, type: "remote" },
    ],
  },
  // ── VNBG – Bajhang ──────────────────────────────────────────────────────────
  {
    icao: "VNBG", iata: "BJH",
    name: "Bajhang Airport",
    city: "Bajhang", province: "Sudurpashchim",
    lat: 29.5389, lng: 81.1886, elevM: 1452,
    longestRunwayM: 600, surfaceType: "gravel",
    category: "stol", active: true,
    runways: [rwy("03", 30, 600, 20, "gravel")],
    frequencies: [freq("UNICOM", "Bajhang Radio", 122.50)],
    approaches: [approach("VISUAL", "03", 1600, 5000)],
    parkingPositions: [],
  },
  // ── VNBJ – Bajura ───────────────────────────────────────────────────────────
  {
    icao: "VNBJ", iata: "BJU",
    name: "Bajura Airport",
    city: "Bajura", province: "Sudurpashchim",
    lat: 29.5020, lng: 81.6690, elevM: 1476,
    longestRunwayM: 762, surfaceType: "gravel",
    category: "stol", active: true,
    runways: [rwy("13", 130, 762, 20, "gravel")],
    frequencies: [freq("UNICOM", "Bajura Radio", 122.50)],
    approaches: [approach("VISUAL", "13", 1600, 5000)],
    parkingPositions: [],
  },
  // ── VNBR – Bharatpur ────────────────────────────────────────────────────────
  {
    icao: "VNBR", iata: "BHR",
    name: "Bharatpur Airport",
    nameNepali: "भरतपुर विमानस्थल",
    city: "Bharatpur", province: "Bagmati",
    lat: 27.6781, lng: 84.4294, elevM: 209,
    longestRunwayM: 1524, surfaceType: "paved",
    category: "domestic", active: true,
    runways: [
      { ...rwy("02", 20, 1524, 30), elevM: 209, lightingPapi: true },
      { ...rwy("20", 200, 1524, 30), elevM: 209 },
    ],
    frequencies: [
      freq("TWR", "Bharatpur Tower", 118.30),
    ],
    approaches: [approach("NDB", "02", 400, 3200, "BHR")],
    parkingPositions: [
      { id: "R1", lat: 27.6785, lng: 84.4290, headingDeg: 20, type: "remote" },
    ],
  },
  // ── VNBT – Bhojpur ──────────────────────────────────────────────────────────
  {
    icao: "VNBT", iata: "BHP",
    name: "Bhojpur Airport",
    city: "Bhojpur", province: "Koshi",
    lat: 27.1474, lng: 87.0508, elevM: 1470,
    longestRunwayM: 600, surfaceType: "paved",
    category: "stol", active: true,
    runways: [rwy("17", 170, 600, 20, "asphalt")],
    frequencies: [freq("UNICOM", "Bhojpur Radio", 122.50)],
    approaches: [approach("VISUAL", "17", 1600, 5000)],
    parkingPositions: [],
  },
  // ── VNBP – Bharatpur (Chitwan) additional ──────────────────────────────────
  // ── VNDL – Dolpa ────────────────────────────────────────────────────────────
  {
    icao: "VNDL", iata: "DOP",
    name: "Dolpa Airport",
    nameNepali: "डोल्पा विमानस्थल",
    city: "Dolpa", province: "Karnali",
    lat: 28.9857, lng: 82.8190, elevM: 2550,
    longestRunwayM: 780, surfaceType: "gravel",
    category: "stol", active: true,
    terrainWarning: "High mountain terrain. Approach over ridge. One-way circuit.",
    runways: [rwy("05", 50, 780, 20, "gravel")],
    frequencies: [freq("UNICOM", "Dolpa Radio", 122.50)],
    approaches: [approach("VISUAL", "05", 2700, 5000)],
    parkingPositions: [],
  },
  // ── VNDT – Darchula ─────────────────────────────────────────────────────────
  {
    icao: "VNDT", iata: "DAP",
    name: "Darchula Airport",
    city: "Darchula", province: "Sudurpashchim",
    lat: 29.6690, lng: 80.5481, elevM: 884,
    longestRunwayM: 600, surfaceType: "gravel",
    category: "stol", active: true,
    runways: [rwy("16", 160, 600, 18, "gravel")],
    frequencies: [freq("UNICOM", "Darchula Radio", 122.50)],
    approaches: [approach("VISUAL", "16", 1000, 5000)],
    parkingPositions: [],
  },
  // ── VNDH – Dhangarhi ────────────────────────────────────────────────────────
  {
    icao: "VNDH", iata: "DHI",
    name: "Dhangarhi Airport",
    nameNepali: "धनगढी विमानस्थल",
    city: "Dhangarhi", province: "Sudurpashchim",
    lat: 28.7533, lng: 80.5819, elevM: 178,
    longestRunwayM: 1400, surfaceType: "paved",
    category: "domestic", active: true,
    runways: [
      { ...rwy("07", 70, 1400, 30), elevM: 178, lightingPapi: true },
      { ...rwy("25", 250, 1400, 30), elevM: 178 },
    ],
    frequencies: [
      freq("TWR", "Dhangarhi Tower", 118.90),
    ],
    approaches: [
      approach("NDB", "07", 350, 3200, "DHI"),
      approach("RNAV_GNSS", "07", 280, 2400, "RNAV_DHI_07"),
    ],
    parkingPositions: [
      { id: "R1", lat: 28.7538, lng: 80.5812, headingDeg: 70, type: "remote" },
    ],
  },
  // ── VNHN – Humla (Simikot) ──────────────────────────────────────────────────
  {
    icao: "VNHN", iata: "IMK",
    name: "Simikot Airport",
    city: "Humla", province: "Karnali",
    lat: 29.9713, lng: 81.8188, elevM: 2942,
    longestRunwayM: 630, surfaceType: "gravel",
    category: "stol", active: true,
    terrainWarning: "Extreme terrain. Min safe altitude 5000m in approach sector.",
    runways: [rwy("07", 70, 630, 18, "gravel")],
    frequencies: [freq("UNICOM", "Simikot Radio", 122.50)],
    approaches: [approach("VISUAL", "07", 3100, 5000)],
    parkingPositions: [],
  },
  // ── VNIJ – Ilam ─────────────────────────────────────────────────────────────
  {
    icao: "VNIJ", iata: "ILM",
    name: "Ilam Airport",
    city: "Ilam", province: "Koshi",
    lat: 26.8908, lng: 87.9258, elevM: 1149,
    longestRunwayM: 600, surfaceType: "paved",
    category: "stol", active: false,
    runways: [rwy("04", 40, 600, 18, "asphalt")],
    frequencies: [freq("UNICOM", "Ilam Radio", 122.50)],
    approaches: [approach("VISUAL", "04", 1300, 5000)],
    parkingPositions: [],
  },
  // ── VNJS – Jomsom ───────────────────────────────────────────────────────────
  {
    icao: "VNJS", iata: "JMO",
    name: "Jomsom Airport",
    nameNepali: "जोमसोम विमानस्थल",
    city: "Jomsom", province: "Gandaki",
    lat: 28.7803, lng: 83.7230, elevM: 2749,
    longestRunwayM: 680, surfaceType: "gravel",
    category: "stol", active: true,
    terrainWarning: "Severe crosswind corridor. Annapurna massif to east.",
    runways: [rwy("06", 60, 680, 20, "gravel")],
    frequencies: [freq("UNICOM", "Jomsom Radio", 122.50)],
    approaches: [approach("VISUAL", "06", 2900, 5000)],
    parkingPositions: [],
  },
  // ── VNKL – Kangel Danda ──────────────────────────────────────────────────────
  {
    icao: "VNKL", iata: "KEP",
    name: "Nepalganj Airport",
    nameNepali: "नेपालगंज विमानस्थल",
    city: "Nepalgunj", province: "Lumbini",
    lat: 28.1035, lng: 81.6672, elevM: 155,
    longestRunwayM: 1700, surfaceType: "paved",
    category: "domestic", active: true,
    runways: [
      { ...rwy("05", 50, 1700, 30), elevM: 155, lightingPapi: true },
      { ...rwy("23", 230, 1700, 30), elevM: 155 },
    ],
    frequencies: [
      freq("TWR", "Nepalgunj Tower", 118.10),
      freq("APP", "Nepalgunj Approach", 120.90),
    ],
    approaches: [
      approach("NDB", "05", 340, 3200, "KEP"),
      approach("RNAV_GNSS", "05", 280, 2400, "RNAV_KEP_05"),
    ],
    parkingPositions: [
      { id: "R1", lat: 28.1040, lng: 81.6665, headingDeg: 50, type: "remote" },
    ],
  },
  // ── VNLK – Lamidanda ────────────────────────────────────────────────────────
  {
    icao: "VNLK", iata: "LDN",
    name: "Lamidanda Airport",
    city: "Lamidanda", province: "Koshi",
    lat: 27.2531, lng: 86.6699, elevM: 1247,
    longestRunwayM: 530, surfaceType: "paved",
    category: "stol", active: true,
    runways: [rwy("12", 120, 530, 18, "asphalt")],
    frequencies: [freq("UNICOM", "Lamidanda Radio", 122.50)],
    approaches: [approach("VISUAL", "12", 1400, 5000)],
    parkingPositions: [],
  },
  // ── VNLT variant – Langtang area placeholder ────────────────────────────────
  // ── VNMN – Manang ───────────────────────────────────────────────────────────
  {
    icao: "VNMN", iata: "NGX",
    name: "Manang Airport",
    city: "Manang", province: "Gandaki",
    lat: 28.6414, lng: 84.0892, elevM: 3352,
    longestRunwayM: 900, surfaceType: "gravel",
    category: "stol", active: true,
    terrainWarning: "High altitude. Annapurna Circuit valley. Density altitude extreme.",
    runways: [rwy("10", 100, 900, 20, "gravel")],
    frequencies: [freq("UNICOM", "Manang Radio", 122.50)],
    approaches: [approach("VISUAL", "10", 3500, 5000)],
    parkingPositions: [],
  },
  // ── VNMG – Meghauli ─────────────────────────────────────────────────────────
  {
    icao: "VNMG", iata: "MEY",
    name: "Meghauli Airport",
    city: "Meghauli", province: "Bagmati",
    lat: 27.5774, lng: 84.2288, elevM: 204,
    longestRunwayM: 900, surfaceType: "grass",
    category: "stol", active: true,
    runways: [rwy("07", 70, 900, 20, "grass")],
    frequencies: [freq("UNICOM", "Meghauli Radio", 122.50)],
    approaches: [approach("VISUAL", "07", 350, 5000)],
    parkingPositions: [],
  },
  // ── VNMK – Mustang (Lo Manthang) ────────────────────────────────────────────
  {
    icao: "VNMK", iata: null,
    name: "Mustang Airport",
    city: "Lo Manthang", province: "Gandaki",
    lat: 29.1813, lng: 83.9749, elevM: 3730,
    longestRunwayM: 600, surfaceType: "gravel",
    category: "stol", active: true,
    terrainWarning: "Extreme high altitude. Density altitude 15000+ ft in summer.",
    runways: [rwy("18", 180, 600, 18, "gravel")],
    frequencies: [freq("UNICOM", "Mustang Radio", 122.50)],
    approaches: [approach("VISUAL", "18", 3900, 5000)],
    parkingPositions: [],
  },
  // ── VNPL – Phaplu ───────────────────────────────────────────────────────────
  {
    icao: "VNPL", iata: "PPL",
    name: "Phaplu Airport",
    city: "Phaplu", province: "Koshi",
    lat: 27.5175, lng: 86.5844, elevM: 2413,
    longestRunwayM: 550, surfaceType: "paved",
    category: "stol", active: true,
    runways: [rwy("08", 80, 550, 18, "asphalt")],
    frequencies: [freq("UNICOM", "Phaplu Radio", 122.50)],
    approaches: [approach("VISUAL", "08", 2600, 5000)],
    parkingPositions: [],
  },
  // ── VNRB – Ramechhap ────────────────────────────────────────────────────────
  {
    icao: "VNRB", iata: "RHP",
    name: "Ramechhap Airport",
    nameNepali: "रामेछाप विमानस्थल",
    city: "Ramechhap", province: "Bagmati",
    lat: 27.3937, lng: 86.0615, elevM: 481,
    longestRunwayM: 1050, surfaceType: "paved",
    category: "domestic", active: true,
    runways: [
      { ...rwy("04", 40, 1050, 25), elevM: 481, lightingPapi: true },
      { ...rwy("22", 220, 1050, 25), elevM: 481 },
    ],
    frequencies: [freq("TWR", "Ramechhap Tower", 118.30)],
    approaches: [approach("RNAV_GNSS", "04", 620, 2400, "RNAV_RHP_04")],
    parkingPositions: [
      { id: "R1", lat: 27.3942, lng: 86.0608, headingDeg: 40, type: "remote" },
    ],
  },
  // ── VNRP – Rolpa ────────────────────────────────────────────────────────────
  {
    icao: "VNRP", iata: "RPA",
    name: "Rolpa Airport",
    city: "Rolpa", province: "Lumbini",
    lat: 28.2780, lng: 82.7165, elevM: 1560,
    longestRunwayM: 575, surfaceType: "gravel",
    category: "stol", active: true,
    runways: [rwy("10", 100, 575, 18, "gravel")],
    frequencies: [freq("UNICOM", "Rolpa Radio", 122.50)],
    approaches: [approach("VISUAL", "10", 1700, 5000)],
    parkingPositions: [],
  },
  // ── VNRK – Rukum (Chaurjahari) ──────────────────────────────────────────────
  {
    icao: "VNRK", iata: "RUK",
    name: "Chaurjahari Airport",
    city: "Rukum", province: "Lumbini",
    lat: 28.6270, lng: 82.1945, elevM: 1001,
    longestRunwayM: 585, surfaceType: "gravel",
    category: "stol", active: true,
    runways: [rwy("08", 80, 585, 18, "gravel")],
    frequencies: [freq("UNICOM", "Chaurjahari Radio", 122.50)],
    approaches: [approach("VISUAL", "08", 1150, 5000)],
    parkingPositions: [],
  },
  // ── VNSB – Surkhet ──────────────────────────────────────────────────────────
  {
    icao: "VNSB", iata: "SKH",
    name: "Surkhet Airport",
    nameNepali: "सुर्खेत विमानस्थल",
    city: "Surkhet", province: "Karnali",
    lat: 28.5858, lng: 81.6361, elevM: 724,
    longestRunwayM: 1067, surfaceType: "paved",
    category: "domestic", active: true,
    runways: [
      { ...rwy("08", 80, 1067, 25), elevM: 724 },
      { ...rwy("26", 260, 1067, 25), elevM: 724 },
    ],
    frequencies: [freq("TWR", "Surkhet Tower", 118.10)],
    approaches: [approach("NDB", "08", 900, 3200, "SKH")],
    parkingPositions: [
      { id: "R1", lat: 28.5862, lng: 81.6355, headingDeg: 80, type: "remote" },
    ],
  },
  // ── VNSM – Simara ───────────────────────────────────────────────────────────
  {
    icao: "VNSM", iata: "SIF",
    name: "Simara Airport",
    nameNepali: "सिमरा विमानस्थल",
    city: "Simara", province: "Bagmati",
    lat: 27.1595, lng: 84.9801, elevM: 138,
    longestRunwayM: 1500, surfaceType: "paved",
    category: "domestic", active: true,
    runways: [
      { ...rwy("01", 10, 1500, 30), elevM: 138, lightingPapi: true },
      { ...rwy("19", 190, 1500, 30), elevM: 138 },
    ],
    frequencies: [
      freq("TWR", "Simara Tower", 118.10),
    ],
    approaches: [approach("NDB", "01", 270, 3200, "SIF")],
    parkingPositions: [
      { id: "R1", lat: 27.1600, lng: 84.9795, headingDeg: 10, type: "remote" },
    ],
  },
  // ── VNTJ – Taplejung ────────────────────────────────────────────────────────
  {
    icao: "VNTJ", iata: "TPJ",
    name: "Taplejung Airport",
    city: "Taplejung", province: "Koshi",
    lat: 27.3509, lng: 87.6952, elevM: 2451,
    longestRunwayM: 549, surfaceType: "paved",
    category: "stol", active: true,
    terrainWarning: "Kanchenjunga approaches to northeast.",
    runways: [rwy("02", 20, 549, 18, "asphalt")],
    frequencies: [freq("UNICOM", "Taplejung Radio", 122.50)],
    approaches: [approach("VISUAL", "02", 2600, 5000)],
    parkingPositions: [],
  },
  // ── VNTD – Tansen ───────────────────────────────────────────────────────────
  {
    icao: "VNTD", iata: null,
    name: "Tansen Airport",
    city: "Tansen", province: "Lumbini",
    lat: 27.8682, lng: 83.5534, elevM: 1372,
    longestRunwayM: 512, surfaceType: "gravel",
    category: "stol", active: false,
    runways: [rwy("07", 70, 512, 18, "gravel")],
    frequencies: [freq("UNICOM", "Tansen Radio", 122.50)],
    approaches: [approach("VISUAL", "07", 1500, 5000)],
    parkingPositions: [],
  },
  // ── VNTK – Tumlingtar ───────────────────────────────────────────────────────
  {
    icao: "VNTK", iata: "TMI",
    name: "Tumlingtar Airport",
    city: "Tumlingtar", province: "Koshi",
    lat: 27.3150, lng: 87.1933, elevM: 405,
    longestRunwayM: 915, surfaceType: "paved",
    category: "domestic", active: true,
    runways: [
      { ...rwy("06", 60, 915, 25), elevM: 405 },
      { ...rwy("24", 240, 915, 25), elevM: 405 },
    ],
    frequencies: [freq("TWR", "Tumlingtar Tower", 118.50)],
    approaches: [approach("NDB", "06", 600, 3200, "TMI")],
    parkingPositions: [
      { id: "R1", lat: 27.3154, lng: 87.1926, headingDeg: 60, type: "remote" },
    ],
  },
  // ── VNTR – Tikapur ──────────────────────────────────────────────────────────
  {
    icao: "VNTR", iata: "TPU",
    name: "Tikapur Airport",
    city: "Tikapur", province: "Sudurpashchim",
    lat: 28.5071, lng: 81.0991, elevM: 174,
    longestRunwayM: 900, surfaceType: "gravel",
    category: "stol", active: true,
    runways: [rwy("09", 90, 900, 20, "gravel")],
    frequencies: [freq("UNICOM", "Tikapur Radio", 122.50)],
    approaches: [approach("VISUAL", "09", 300, 5000)],
    parkingPositions: [],
  },
  // ── VNWI – Wirghat Beni ─────────────────────────────────────────────────────
  {
    icao: "VNWI", iata: null,
    name: "Beni Airport",
    city: "Beni", province: "Gandaki",
    lat: 28.3603, lng: 83.5298, elevM: 859,
    longestRunwayM: 450, surfaceType: "gravel",
    category: "stol", active: false,
    runways: [rwy("08", 80, 450, 15, "gravel")],
    frequencies: [freq("UNICOM", "Beni Radio", 122.50)],
    approaches: [approach("VISUAL", "08", 1000, 5000)],
    parkingPositions: [],
  },
  // ── VNYL – Yoldu ────────────────────────────────────────────────────────────
  {
    icao: "VNYL", iata: null,
    name: "Yoldu Airport",
    city: "Sanfebagar", province: "Sudurpashchim",
    lat: 29.2330, lng: 81.2039, elevM: 1127,
    longestRunwayM: 600, surfaceType: "gravel",
    category: "stol", active: true,
    runways: [rwy("12", 120, 600, 18, "gravel")],
    frequencies: [freq("UNICOM", "Sanfebagar Radio", 122.50)],
    approaches: [approach("VISUAL", "12", 1250, 5000)],
    parkingPositions: [],
  },
];

// ─── Database class ───────────────────────────────────────────────────────────

export class AirportDatabase {
  private static instance: AirportDatabase | null = null;
  private byIcao = new Map<string, NepalAirportExtended>();
  private byIata = new Map<string, NepalAirportExtended>();
  private spatialIndex: Array<{ lat: number; lng: number; icao: string }> = [];

  private constructor() {
    for (const ap of NEPAL_AIRPORTS_RAW) {
      this.byIcao.set(ap.icao.toUpperCase(), ap);
      if (ap.iata) this.byIata.set(ap.iata.toUpperCase(), ap);
      this.spatialIndex.push({ lat: ap.lat, lng: ap.lng, icao: ap.icao });
    }
  }

  public static getInstance(): AirportDatabase {
    if (!AirportDatabase.instance) AirportDatabase.instance = new AirportDatabase();
    return AirportDatabase.instance;
  }

  public getByIcao(icao: string): NepalAirportExtended | undefined {
    return this.byIcao.get(icao.toUpperCase());
  }

  public getByIata(iata: string): NepalAirportExtended | undefined {
    return this.byIata.get(iata.toUpperCase());
  }

  public getAll(): NepalAirportExtended[] {
    return NEPAL_AIRPORTS_RAW;
  }

  public getActive(): NepalAirportExtended[] {
    return NEPAL_AIRPORTS_RAW.filter((a) => a.active);
  }

  public getByCategory(cat: NepalAirportExtended["category"]): NepalAirportExtended[] {
    return NEPAL_AIRPORTS_RAW.filter((a) => a.category === cat);
  }

  /** Nearest N airports to a lat/lng, sorted by great-circle distance. */
  public nearest(lat: number, lng: number, limit = 10): NepalAirportExtended[] {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    return this.spatialIndex
      .map((p) => {
        const dLat = toRad(p.lat - lat);
        const dLng = toRad(p.lng - lng);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(lat)) * Math.cos(toRad(p.lat)) * Math.sin(dLng / 2) ** 2;
        const distM = 2 * R * Math.asin(Math.sqrt(a));
        return { distM, ap: this.byIcao.get(p.icao)! };
      })
      .sort((a, b) => a.distM - b.distM)
      .slice(0, limit)
      .map((x) => x.ap);
  }

  /** Search by name, ICAO, IATA, or city. */
  public search(query: string, limit = 20): NepalAirportExtended[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.getAll().slice(0, limit);
    const scored: Array<{ ap: NepalAirportExtended; s: number }> = [];
    for (const ap of NEPAL_AIRPORTS_RAW) {
      let s = 0;
      if (ap.icao.toLowerCase() === q) s = 100;
      else if (ap.iata?.toLowerCase() === q) s = 95;
      else if (ap.icao.toLowerCase().startsWith(q)) s = 80;
      else if (ap.name.toLowerCase().includes(q)) s = 60;
      else if (ap.city.toLowerCase().includes(q)) s = 50;
      else if (ap.province.toLowerCase().includes(q)) s = 30;
      if (s > 0) scored.push({ ap, s });
    }
    return scored.sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.ap);
  }

  /** Convert NepalAirportExtended to core Airport type (compatible with gameStore/AirportService). */
  public toCoreAirport(ap: NepalAirportExtended): import("../Types").Airport {
    return {
      icao: ap.icao,
      iata: ap.iata,
      name: ap.name,
      city: ap.city,
      country: "NP",
      lat: ap.lat,
      lng: ap.lng,
      elevM: ap.elevM,
      runways: ap.runways.map((r) => ({
        id: r.id,
        headingDeg: r.headingDeg,
        lengthM: r.lengthM,
        widthM: r.widthM,
      })),
      frequencies: ap.frequencies.map((f) => ({
        type: f.type,
        mhz: f.mhz,
        name: f.name,
      })),
      gates: ap.parkingPositions
        .filter((p) => p.type === "gate")
        .map((p) => ({ id: p.id, lat: p.lat, lng: p.lng })),
    };
  }
}

export const airportDb = AirportDatabase.getInstance();

/** Convenience: get Nepal airport or fall back to core AirportService. */
export function getNepalAirport(icao: string): NepalAirportExtended | undefined {
  return airportDb.getByIcao(icao);
}
