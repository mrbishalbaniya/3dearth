import type { FlightState } from "../Types";
import { useEarthStore } from "../../earth/store/earthStore";
import { altitudeToZoomLevel } from "../../earth/utils/zoomLevels";
import { peekElevation } from "../../earth/streaming";
import { getAirport } from "../Services/AirportService";
import { useGameStore } from "../store/gameStore";

/** Push aircraft pose into earthStore so GIS tiles / labels stream under the plane. */
export function syncFlightToEarth(state: FlightState) {
  const spawnIcao = useGameStore.getState().spawnAirportIcao;
  const airportElev = spawnIcao ? getAirport(spawnIcao)?.elevM : undefined;
  const ground = peekElevation(state.lat, state.lng) ?? airportElev ?? null;

  // LOD expects height above terrain — never treat highland MSL as AGL when DEM is cold
  const aglM =
    ground != null ? Math.max(25, state.altM - ground) : 80;

  const level = altitudeToZoomLevel(aglM);
  useEarthStore.getState().setTelemetry({
    focusLat: state.lat,
    focusLng: state.lng,
    altitudeM: aglM,
    heading: state.yawDeg,
    pitch: state.pitchDeg,
    zoomLevel: level.id,
    zoomLevelName: level.name,
    surfaceMode: aglM < 25_000,
  });
}
