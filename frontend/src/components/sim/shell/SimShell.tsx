"use client";

import { SimMainMenu } from "./SimMainMenu";
import { DeveloperPanel } from "./DeveloperPanel";
import { ToastStack } from "../notifications/ToastStack";
import { MissionsPanel } from "../missions/MissionsPanel";
import { ProfilePanel } from "../profile/ProfilePanel";
import { SettingsPanel } from "../settings/SettingsPanel";
import { MultiplayerPanel } from "../multiplayer/MultiplayerPanel";
import { CameraRadial } from "../camera/CameraRadial";

export function SimShell() {
  return (
    <>
      <SimMainMenu />
      <MissionsPanel />
      <ProfilePanel />
      <SettingsPanel />
      <MultiplayerPanel />
      <CameraRadial />
      <ToastStack />
      <DeveloperPanel />
    </>
  );
}
