/**
 * The scrapbook wall: strips the visitor chose to pin, stored in IndexedDB in
 * this browser only. Nothing leaves the device. Every call can fail (private
 * mode, blocked storage, quota), so callers must handle rejections.
 */

const DB = "snaproom";
const STORE = "strips";
const CHANGED = "snaproom:wall-changed";

export type SavedStrip = {
  id: string;
  createdAt: number;
  machineId: string;
  layoutId: string;
  caption: string;
  width: number;
  height: number;
  /** JPEG of the finished strip (smaller than PNG for storage). */
  blob: Blob;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB is not available"));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Couldn't open storage"));
    req.onblocked = () => reject(new Error("Storage is blocked"));
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error ?? new Error("Storage error"));
      tx.onabort = () => reject(tx.error ?? new Error("Storage aborted (out of space?)"));
    });
  } finally {
    db.close();
  }
}

const notify = () => window.dispatchEvent(new Event(CHANGED));

export async function saveStrip(strip: SavedStrip) {
  await run("readwrite", (s) => s.put(strip));
  notify();
}

/** Pins a strip (or updates an earlier pin when `id` is given). Returns the id. */
export async function pinStrip(data: Omit<SavedStrip, "id" | "createdAt">, id?: string): Promise<string> {
  const finalId = id ?? `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await saveStrip({ ...data, id: finalId, createdAt: Date.now() });
  return finalId;
}

export async function deleteStrip(id: string) {
  await run("readwrite", (s) => s.delete(id));
  notify();
}

export async function listStrips(): Promise<SavedStrip[]> {
  const all = await run<SavedStrip[]>("readonly", (s) => s.getAll() as IDBRequest<SavedStrip[]>);
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export function onWallChanged(listener: () => void) {
  window.addEventListener(CHANGED, listener);
  return () => window.removeEventListener(CHANGED, listener);
}
