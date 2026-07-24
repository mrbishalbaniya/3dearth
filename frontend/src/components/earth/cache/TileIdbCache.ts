/**
 * IndexedDB persistent tile blob cache — survives reloads, cuts repeat network.
 * Stores raw image ArrayBuffers keyed by URL; GPU textures stay in RAM LRU.
 */

const DB_NAME = "orbit-tile-cache-v1";
const STORE = "tiles";
const MAX_ENTRIES = 2_400;
const TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

interface IdbRow {
  key: string;
  blob: ArrayBuffer;
  mime: string;
  bytes: number;
  storedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;
let entryCount = 0;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("no idb"));
  }
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("storedAt", "storedAt");
      }
    };
    req.onsuccess = () => {
      resolve(req.result);
      void countEntries().then((n) => {
        entryCount = n;
      });
    };
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function countEntries(): Promise<number> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

export function getIdbEntryCount(): number {
  return entryCount;
}

export async function idbGetTile(
  key: string,
): Promise<{ buffer: ArrayBuffer; mime: string } | null> {
  try {
    const db = await openDb();
    const row = await new Promise<IdbRow | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as IdbRow | undefined);
      req.onerror = () => reject(req.error);
    });
    if (!row) return null;
    if (Date.now() - row.storedAt > TTL_MS) {
      void idbDelete(key);
      return null;
    }
    return { buffer: row.blob, mime: row.mime };
  } catch {
    return null;
  }
}

export async function idbPutTile(
  key: string,
  buffer: ArrayBuffer,
  mime: string,
): Promise<void> {
  try {
    const db = await openDb();
    const row: IdbRow = {
      key,
      blob: buffer,
      mime,
      bytes: buffer.byteLength,
      storedAt: Date.now(),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(row);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    entryCount += 1;
    if (entryCount > MAX_ENTRIES) void idbEvictOldest(Math.floor(MAX_ENTRIES * 0.15));
  } catch {
    /* ignore quota / private mode */
  }
}

async function idbDelete(key: string) {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    entryCount = Math.max(0, entryCount - 1);
  } catch {
    /* ignore */
  }
}

async function idbEvictOldest(n: number) {
  try {
    const db = await openDb();
    const keys = await new Promise<string[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const idx = tx.objectStore(STORE).index("storedAt");
      const req = idx.getAllKeys(undefined, n);
      req.onsuccess = () => resolve(req.result as string[]);
      req.onerror = () => reject(req.error);
    });
    await Promise.all(keys.map(idbDelete));
  } catch {
    /* ignore */
  }
}

/** Fetch with AbortSignal → ArrayBuffer; used by TileLoader. */
export async function fetchTileBuffer(
  url: string,
  signal?: AbortSignal,
): Promise<{ buffer: ArrayBuffer; mime: string }> {
  const res = await fetch(url, {
    signal,
    mode: "cors",
    credentials: "omit",
    // Prefer cache when available
    cache: "force-cache",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const mime = res.headers.get("content-type") || "image/png";
  const buffer = await res.arrayBuffer();
  return { buffer, mime };
}
