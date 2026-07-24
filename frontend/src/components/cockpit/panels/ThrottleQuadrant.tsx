"use client";

import { Lever, PushButton } from "../controls/Interactive";
import { useCockpitStore } from "../stores/cockpitStore";
import { useGameStore } from "../../game/store/gameStore";

export function ThrottleQuadrant() {
  const setpoint = useCockpitStore((s) => s.throttleSetpoint);
  const flightThr = useGameStore((s) => s.flightState?.throttle ?? 0);
  const throttle = setpoint ?? flightThr;
  const setThrottle = useCockpitStore((s) => s.setThrottleSetpoint);
  const flaps = useGameStore((s) => s.flightState?.flaps ?? 0);
  const gear = useGameStore((s) => s.flightState?.gearDown ?? true);
  const patchFlight = useGameStore((s) => s.patchFlightState);
  const requestGear = useCockpitStore((s) => s.requestGearToggle);
  const speedBrake = useCockpitStore((s) => s.speedBrake);
  const setSpeedBrake = useCockpitStore((s) => s.setSpeedBrake);
  const park = useCockpitStore((s) => s.parkingBrake);
  const setPark = useCockpitStore((s) => s.setParkingBrake);
  const trim = useCockpitStore((s) => s.trimElevator);
  const setTrim = useCockpitStore((s) => s.setTrimElevator);

  return (
    <section className="ck-throttle" aria-label="Throttle quadrant">
      <Lever label="THR" value={throttle} onChange={(v) => setThrottle(v)} />
      <Lever
        label="FLAPS"
        value={flaps}
        onChange={(v) => {
          const stepped = v < 0.25 ? 0 : v < 0.75 ? 0.5 : 1;
          patchFlight({ flaps: stepped });
        }}
      />
      <Lever label="SPDBRK" value={speedBrake} onChange={setSpeedBrake} />
      <Lever
        label="TRIM"
        value={(trim + 1) / 2}
        onChange={(v) => setTrim(v * 2 - 1)}
      />
      <div className="ck-throttle__btns">
        <PushButton
          tone={gear ? "green" : "amber"}
          lit
          onClick={() => requestGear()}
        >
          GEAR {gear ? "DN" : "UP"}
        </PushButton>
        <PushButton
          tone="red"
          lit={park}
          onClick={() => {
            setPark(!park);
            patchFlight({ brakes: !park });
          }}
        >
          PARK
        </PushButton>
        <PushButton tone="white" onClick={() => setThrottle(null)}>
          KB THR
        </PushButton>
      </div>
    </section>
  );
}
