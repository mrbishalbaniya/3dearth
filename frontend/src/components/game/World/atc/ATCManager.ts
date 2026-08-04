import type { AirportLayout } from "../../../earth/airport/types";
import type { AtcClearance, ClearanceType, PlayerAtcState, TrafficAircraft, TrafficAnalytics } from "../types";
import { issueClearance, facilityForPhase } from "../atc/AtcService";
import { ATCRadio } from "./ATCRadio";
import { ApproachController } from "./ApproachController";
import { DepartureController } from "./DepartureController";
import { EmergencyManager } from "./EmergencyManager";
import { FlightScheduler } from "./FlightScheduler";
import { GateManager } from "./GateManager";
import { GroundController } from "./GroundController";
import { NavigationManager } from "./NavigationManager";
import { ParkingManager } from "./ParkingManager";
import { RunwayManager } from "./RunwayManager";
import { TaxiManager } from "./TaxiManager";
import { TowerController } from "./TowerController";
import { ConflictDetection } from "./ConflictDetection";
import { TrafficManager } from "./TrafficManager";

export class ATCManager {
  readonly traffic = new TrafficManager();
  readonly runwayManager = new RunwayManager();
  readonly conflicts = new ConflictDetection();
  readonly emergency = new EmergencyManager();
  readonly scheduler = new FlightScheduler();
  readonly radio: ATCRadio;
  navigation: NavigationManager;
  taxi: TaxiManager;
  gate: GateManager;
  parking: ParkingManager;
  ground: GroundController;
  tower: TowerController;
  approach: ApproachController;
  departure: DepartureController;
  playerAtc: PlayerAtcState;

  constructor(layout: AirportLayout) {
    this.playerAtc = {
      facility: "ground",
      callsign: "ORBIT1",
      pendingRequest: null,
      lastClearance: null,
      messages: [],
      frequencyMhz: 121.7,
    };
    this.radio = new ATCRadio(this.playerAtc);
    this.navigation = new NavigationManager(layout);
    this.taxi = new TaxiManager(this.navigation);
    this.gate = new GateManager(layout);
    this.parking = new ParkingManager(layout);
    this.ground = new GroundController(this.runwayManager, this.radio);
    this.tower = new TowerController(this.runwayManager, this.radio);
    this.approach = new ApproachController(this.runwayManager, this.radio);
    this.departure = new DepartureController(this.runwayManager, this.radio);
  }

  getAnalytics(): TrafficAnalytics {
    return { ...this.traffic.analytics };
  }

  getRadioLog(): AtcClearance[] {
    return this.radio.getMessages();
  }

  getRenderable(max = 40): TrafficAircraft[] {
    return this.traffic.list().slice(0, max);
  }

  clear(): void {
    this.traffic.clear();
    this.radio.clear();
  }

  addTraffic(aircraft: TrafficAircraft): void {
    this.traffic.add(aircraft);
  }

  updateTraffic(aircraft: TrafficAircraft): void {
    this.traffic.update(aircraft);
  }

  removeTraffic(id: string): void {
    this.traffic.remove(id);
  }

  stepTraffic(aircraft: TrafficAircraft, dt: number, visibility = 1): TrafficAircraft {
    const airportOps: undefined = undefined;
    const afterGround = this.ground.step(aircraft, airportOps, dt);
    const afterTower = this.tower.step(afterGround, airportOps, dt);
    const afterApproach = this.approach.step(afterTower, airportOps, dt, visibility);
    return this.departure.step(afterApproach, airportOps, dt);
  }

  request(type: ClearanceType, opts: { callsign: string; onGround: boolean; altM: number; runwayId?: string }): AtcClearance {
    const facility = opts.onGround ? "ground" : facilityForPhase(type === "landing" ? "landing" : type === "takeoff" ? "takeoff" : "cruise");
    const clearance = issueClearance(facility, type, "player", opts.callsign, {
      runwayId: opts.runwayId,
      altitudeM: type === "climb" ? opts.altM + 1000 : undefined,
    });
    this.radio.setFacility(facility);
    this.radio.push(clearance);
    return clearance;
  }
}
