/**
 * Download a Sketchfab model as glTF/GLB using a personal API token.
 *
 * Usage:
 *   set SKETCHFAB_API_TOKEN=...
 *   node scripts/download-sketchfab-model.mjs <model-uid> [out.glb]
 *
 * Get a token: https://sketchfab.com/settings/password
 * Find UID in the model URL: sketchfab.com/3d-models/<slug>-<UID>
 */
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const token = process.env.SKETCHFAB_API_TOKEN;
const uid = process.argv[2];
const outPath = resolve(
  process.argv[3] ?? `public/models/aircraft/${uid}.glb`,
);

if (!token) {
  console.error("Set SKETCHFAB_API_TOKEN (Sketchfab → Settings → Password → API token)");
  process.exit(1);
}
if (!uid) {
  console.error("Usage: node scripts/download-sketchfab-model.mjs <model-uid> [out.glb]");
  process.exit(1);
}

const headers = {
  Authorization: `Token ${token}`,
};

async function main() {
  const metaRes = await fetch(`https://api.sketchfab.com/v3/models/${uid}`, {
    headers,
  });
  if (!metaRes.ok) {
    throw new Error(`Model meta ${metaRes.status}: ${await metaRes.text()}`);
  }
  const meta = await metaRes.json();
  console.log(`Model: ${meta.name}`);
  console.log(`License: ${meta.license?.label ?? "unknown"}`);
  console.log(`Downloadable: ${meta.isDownloadable}`);
  if (!meta.isDownloadable) {
    throw new Error("This model is not downloadable on Sketchfab.");
  }

  const dlRes = await fetch(
    `https://api.sketchfab.com/v3/models/${uid}/download`,
    { headers },
  );
  if (!dlRes.ok) {
    throw new Error(`Download API ${dlRes.status}: ${await dlRes.text()}`);
  }
  const dl = await dlRes.json();
  // Prefer glTF binary archive
  const url =
    dl.gltf?.url ??
    dl.glb?.url ??
    dl.source?.url ??
    dl.obj?.url;
  if (!url) {
    throw new Error(`No download URL in response: ${JSON.stringify(dl)}`);
  }

  mkdirSync(dirname(outPath), { recursive: true });
  console.log(`Fetching archive…`);
  const fileRes = await fetch(url);
  if (!fileRes.ok || !fileRes.body) {
    throw new Error(`Archive fetch failed ${fileRes.status}`);
  }

  // Sketchfab usually returns a .zip of glTF; save as .zip then hint user
  const isZip = url.includes(".zip") || outPath.endsWith(".zip");
  const target = isZip || !outPath.endsWith(".glb")
    ? outPath.replace(/\.glb$/i, ".zip")
    : outPath;

  await pipeline(Readable.fromWeb(fileRes.body), createWriteStream(target));
  console.log(`Saved: ${target}`);
  if (target.endsWith(".zip")) {
    console.log(
      "Unzip and copy the .glb (or .gltf + bins) into public/models/aircraft/, then set exteriorModelUrl.",
    );
  }
  console.log(`Credit author: ${meta.user?.displayName ?? meta.user?.username}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
