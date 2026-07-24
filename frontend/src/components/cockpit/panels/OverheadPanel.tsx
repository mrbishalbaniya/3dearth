"use client";

import { ToggleSwitch } from "../controls/Interactive";
import { useCockpitStore } from "../stores/cockpitStore";

export function OverheadPanel() {
  const oh = useCockpitStore((s) => s.overhead);
  const patch = useCockpitStore((s) => s.patchOverhead);
  const open = useCockpitStore((s) => s.showOverhead);
  const setOpen = useCockpitStore((s) => s.setShowOverhead);
  const emergency = useCockpitStore((s) => s.emergencyRed);
  const setEmergency = useCockpitStore((s) => s.setEmergencyRed);
  const bright = useCockpitStore((s) => s.panelBrightness);
  const setBright = useCockpitStore((s) => s.setPanelBrightness);

  if (!open) return null;

  return (
    <div className="ck-overhead-wrap">
      <section className="ck-overhead" aria-label="Overhead panel">
        <header>
          <strong>OVERHEAD</strong>
          <button type="button" className="sim-chip" onClick={() => setOpen(false)}>
            Close
          </button>
        </header>

        <div className="ck-overhead__grid">
          <fieldset>
            <legend>Electrical</legend>
            <ToggleSwitch
              label="Battery"
              on={oh.battery}
              onChange={(v) => patch({ battery: v })}
            />
            <ToggleSwitch
              label="Alternator"
              on={oh.alternator}
              onChange={(v) => patch({ alternator: v })}
            />
            <ToggleSwitch
              label="Avionics"
              on={oh.avionics}
              onChange={(v) => patch({ avionics: v })}
            />
          </fieldset>
          <fieldset>
            <legend>Fuel / Hyd</legend>
            <ToggleSwitch
              label="Fuel L"
              on={oh.fuelPumpL}
              onChange={(v) => patch({ fuelPumpL: v })}
            />
            <ToggleSwitch
              label="Fuel R"
              on={oh.fuelPumpR}
              onChange={(v) => patch({ fuelPumpR: v })}
            />
            <ToggleSwitch
              label="Hyd Pump"
              on={oh.hydPump}
              onChange={(v) => patch({ hydPump: v })}
            />
          </fieldset>
          <fieldset>
            <legend>Lights</legend>
            <ToggleSwitch
              label="Beacon"
              on={oh.beacon}
              onChange={(v) => patch({ beacon: v })}
            />
            <ToggleSwitch
              label="Nav"
              on={oh.navLights}
              onChange={(v) => patch({ navLights: v })}
            />
            <ToggleSwitch
              label="Strobe"
              on={oh.strobe}
              onChange={(v) => patch({ strobe: v })}
            />
            <ToggleSwitch
              label="Landing"
              on={oh.landingLight}
              onChange={(v) => patch({ landingLight: v })}
            />
            <ToggleSwitch
              label="Taxi"
              on={oh.taxiLight}
              onChange={(v) => patch({ taxiLight: v })}
            />
          </fieldset>
          <fieldset>
            <legend>Ice / APU / Air</legend>
            <ToggleSwitch
              label="Pitot Heat"
              on={oh.pitotHeat}
              onChange={(v) => patch({ pitotHeat: v })}
            />
            <ToggleSwitch
              label="APU"
              on={oh.apu}
              onChange={(v) => patch({ apu: v })}
            />
            <ToggleSwitch
              label="Bleed"
              on={oh.bleed}
              onChange={(v) => patch({ bleed: v })}
            />
            <ToggleSwitch
              label="Pack"
              on={oh.pack}
              onChange={(v) => patch({ pack: v })}
            />
            <ToggleSwitch
              label="Emerg Lite"
              on={emergency}
              danger
              onChange={setEmergency}
            />
          </fieldset>
        </div>

        <label className="ck-overhead__bright">
          Panel brightness
          <input
            type="range"
            min={0.35}
            max={1}
            step={0.05}
            value={bright}
            onChange={(e) => setBright(Number(e.target.value))}
          />
        </label>
      </section>
    </div>
  );
}
