import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { BrickRecord, PurchaseStore, SetRecord, ArchiveColor } from "@/types/archiveData";
import { fetchRebrickableColors } from "@lib/rebrickable";

const APP_DATA_DIR = process.env.APP_DATA_DIR?.trim();
const DATA_DIR = APP_DATA_DIR ? APP_DATA_DIR : path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "inventory.json");
const DB_FILE = path.join(DATA_DIR, "inventory.sqlite");

interface InventoryPayload {
  sets: SetRecord[];
  bricks: BrickRecord[];
}

let database: DatabaseSync | undefined;

function getDb() {
  if (!database) {
    database = new DatabaseSync(DB_FILE);

    database.exec("PRAGMA journal_mode=WAL");

    database.exec(`
      CREATE TABLE IF NOT EXISTS sets (
        id TEXT PRIMARY KEY,
        setNumber TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        brand TEXT NOT NULL,
        totalPieces INTEGER NOT NULL,
        ownedPieces INTEGER NOT NULL,
        image TEXT NOT NULL,
        source TEXT NOT NULL,
        homologatedToLego INTEGER NOT NULL
      )
    `);

    database.exec(`
      CREATE TABLE IF NOT EXISTS colors (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        rgb TEXT NOT NULL
      )
    `);

    const existingBrickColumns = database
      .prepare("PRAGMA table_info(bricks)")
      .all() as Array<{ name: string }>;
    const isOldSchema = existingBrickColumns.some((c) => c.name === "fromSet");

    if (isOldSchema) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS bricks_new (
          elementId TEXT PRIMARY KEY,
          reference TEXT NOT NULL,
          name TEXT NOT NULL,
          colorId INTEGER NOT NULL,
          image TEXT NOT NULL,
          buyAt TEXT NOT NULL DEFAULT '["lego","bricklink"]',
          plannedStore TEXT,
          plannedQuantity INTEGER,
          plannedLegoQuantity INTEGER,
          plannedBricklinkQuantity INTEGER
        )
      `);
      database.exec(`
        CREATE TABLE IF NOT EXISTS set_bricks (
          setNumber TEXT NOT NULL,
          elementId TEXT NOT NULL,
          required INTEGER NOT NULL,
          stock INTEGER NOT NULL,
          PRIMARY KEY (setNumber, elementId)
        )
      `);
      database.exec("BEGIN");
      try {
        database.exec(`
          INSERT OR IGNORE INTO bricks_new (elementId, reference, name, colorId, image, buyAt, plannedStore, plannedQuantity, plannedLegoQuantity, plannedBricklinkQuantity)
          SELECT elementId, reference, name, colorId, image, buyAt, plannedStore, plannedQuantity, plannedLegoQuantity, plannedBricklinkQuantity FROM bricks
        `);
        database.exec(`
          INSERT INTO set_bricks (setNumber, elementId, required, stock)
          SELECT fromSet, elementId, required, stock FROM bricks
        `);
        database.exec("DROP TABLE bricks");
        database.exec("ALTER TABLE bricks_new RENAME TO bricks");
        database.exec("COMMIT");
      } catch (err) {
        database.exec("ROLLBACK");
        throw err;
      }
    } else {
      database.exec(`
        CREATE TABLE IF NOT EXISTS bricks (
          elementId TEXT PRIMARY KEY,
          reference TEXT NOT NULL,
          name TEXT NOT NULL,
          colorId INTEGER NOT NULL,
          image TEXT NOT NULL,
          buyAt TEXT NOT NULL DEFAULT '["lego","bricklink"]',
          plannedStore TEXT,
          plannedQuantity INTEGER,
          plannedLegoQuantity INTEGER,
          plannedBricklinkQuantity INTEGER
        )
      `);
      database.exec(`
        CREATE TABLE IF NOT EXISTS set_bricks (
          setNumber TEXT NOT NULL,
          elementId TEXT NOT NULL,
          required INTEGER NOT NULL,
          stock INTEGER NOT NULL,
          PRIMARY KEY (setNumber, elementId)
        )
      `);
    }
  }
  return database;
}

function toBoolean(value: unknown) {
  return Number(value) === 1;
}

function parseBuyAt(value: string): PurchaseStore[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed.filter((store) => store === "lego" || store === "bricklink") as PurchaseStore[]) : ["lego", "bricklink"];
  } catch {
    return ["lego", "bricklink"];
  }
}

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true });
  const db = getDb();
  const setCount = Number((db.prepare("SELECT COUNT(*) AS total FROM sets").get() as { total: number }).total);
  const brickCount = Number((db.prepare("SELECT COUNT(*) AS total FROM bricks").get() as { total: number }).total);
  if (setCount > 0 || brickCount > 0) {
    await ensureColors();
    return;
  }
  try {
    const raw = await readFile(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<InventoryPayload>;
    await saveStore({
      sets: Array.isArray(parsed.sets) ? parsed.sets : [],
      bricks: Array.isArray(parsed.bricks) ? parsed.bricks : []
    });
  } catch {
    await saveStore({ sets: [], bricks: [] });
  }
  await ensureColors();
}

async function ensureColors() {
  const db = getDb();
  const colorCount = Number((db.prepare("SELECT COUNT(*) AS total FROM colors").get() as { total: number }).total);
  if (colorCount > 0) return;
  try {
    const colors = await fetchRebrickableColors();
    if (colors.length === 0) return;
    const insertColor = db.prepare("INSERT INTO colors (id, name, rgb) VALUES (?, ?, ?)");
    db.exec("BEGIN");
    try {
      for (const color of colors) {
        insertColor.run(color.id, color.name, `#${color.rgb}`);
      }
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  } catch (error) {
    console.error("Failed to fetch and store colors from Rebrickable:", error);
  }
}

export async function getColors(): Promise<Array<ArchiveColor>> {
  await ensureColors();
  const db = getDb();
  const rows = db.prepare("SELECT id, name, rgb FROM colors ORDER BY name ASC").all() as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    rgb: String(row.rgb)
  }));
}

async function readStore(): Promise<InventoryPayload> {
  await ensureStore();
  const db = getDb();
  const sets = db.prepare("SELECT id, setNumber, name, brand, totalPieces, ownedPieces, image, source, homologatedToLego FROM sets ORDER BY rowid ASC").all() as Array<Record<string, unknown>>;
  const bricks = db.prepare(`
    SELECT b.elementId, b.reference, b.name, b.colorId, b.image, b.buyAt,
           b.plannedStore, b.plannedQuantity, b.plannedLegoQuantity, b.plannedBricklinkQuantity,
           sb.setNumber AS fromSet, sb.required, sb.stock,
           c.name AS colorName, c.rgb AS colorHex
    FROM bricks b
    INNER JOIN set_bricks sb ON sb.elementId = b.elementId
    LEFT JOIN colors c ON b.colorId = c.id
    ORDER BY sb.rowid ASC
  `).all() as Array<Record<string, unknown>>;
  return {
    sets: sets.map((set) => ({ ...set, homologatedToLego: toBoolean(set.homologatedToLego) })) as SetRecord[],
    bricks: bricks.map((brick) => ({ ...brick, buyAt: parseBuyAt(String(brick.buyAt ?? "[]")) })) as BrickRecord[]
  };
}

async function saveStore(payload: InventoryPayload) {
  const db = getDb();
  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM set_bricks; DELETE FROM bricks; DELETE FROM sets;");
    const insertSet = db.prepare("INSERT INTO sets (id, setNumber, name, brand, totalPieces, ownedPieces, image, source, homologatedToLego) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const insertBrick = db.prepare("INSERT OR IGNORE INTO bricks (elementId, reference, name, colorId, image, buyAt, plannedStore, plannedQuantity, plannedLegoQuantity, plannedBricklinkQuantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const insertSetBrick = db.prepare("INSERT INTO set_bricks (setNumber, elementId, required, stock) VALUES (?, ?, ?, ?)");
    for (const set of payload.sets) insertSet.run(set.id, set.setNumber, set.name, set.brand, set.totalPieces, set.ownedPieces, set.image, set.source, set.homologatedToLego ? 1 : 0);
    for (const brick of payload.bricks) {
      insertBrick.run(brick.elementId, brick.reference, brick.name, brick.colorId, brick.image, JSON.stringify(brick.buyAt), brick.plannedStore ?? null, brick.plannedQuantity ?? null, brick.plannedLegoQuantity ?? null, brick.plannedBricklinkQuantity ?? null);
      insertSetBrick.run(brick.fromSet, brick.elementId, brick.required, brick.stock);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

function normalizeNonNegativeInt(value: number, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

function equalsIgnoreCase(left: string, right: string) {
  return left.toLowerCase() === right.toLowerCase();
}

function recalculateOwnedPieces(sets: SetRecord[], bricks: BrickRecord[]) {
  return sets.map((set) => {
    const owned = bricks
      .filter((brick) => brick.fromSet === set.setNumber)
      .reduce((acc, brick) => acc + Math.min(brick.stock, brick.required), 0);
    return { ...set, ownedPieces: Math.min(owned, set.totalPieces) };
  });
}

export async function getInventorySets(): Promise<SetRecord[]> {
  const store = await readStore();
  return store.sets;
}

export async function getBricksCatalog(): Promise<BrickRecord[]> {
  await ensureStore();
  const db = getDb();
  const rows = db.prepare(`
    SELECT b.elementId, b.reference, b.name, b.colorId, b.image, b.buyAt,
           b.plannedStore, b.plannedQuantity, b.plannedLegoQuantity, b.plannedBricklinkQuantity,
           c.name AS colorName, c.rgb AS colorHex
    FROM bricks b
    LEFT JOIN colors c ON b.colorId = c.id
    ORDER BY b.elementId ASC
  `).all() as Array<Record<string, unknown>>;
  return rows.map((row) => ({ ...row, buyAt: parseBuyAt(String(row.buyAt ?? "[]")) })) as BrickRecord[];
}

export async function getInventoryBricks(): Promise<BrickRecord[]> {
  const store = await readStore();
  return store.bricks;
}

export async function getInventoryBricksSet(setNumber: string): Promise<BrickRecord[]> {
  const store = await readStore();
  return store.bricks.filter((brick) => brick.fromSet === setNumber);
}

export async function addSetToInventory(nextSet: SetRecord, bricks: BrickRecord[] = []): Promise<{ added: boolean }> {
  const store = await readStore();
  const alreadyExists = store.sets.some((set) => set.setNumber.toLowerCase() === nextSet.setNumber.toLowerCase());
  if (alreadyExists) {
    return { added: false };
  }
  store.sets = [nextSet, ...store.sets];
  store.bricks = [...store.bricks.filter((brick) => brick.fromSet !== nextSet.setNumber), ...bricks];
  store.sets = recalculateOwnedPieces(store.sets, store.bricks);
  await saveStore(store);
  return { added: true };
}

export async function updateBrickStock(input: { elementId: string; fromSet: string; stock: number }): Promise<{ updated: boolean }> {
  const db = getDb();
  const nextStock = Number.isFinite(input.stock) ? Math.max(0, Math.floor(input.stock)) : 0;
  const result = db.prepare("UPDATE set_bricks SET stock = ? WHERE setNumber = ? AND elementId = ?").run(nextStock, input.fromSet, input.elementId);
  if (result.changes === 0) {
    return { updated: false };
  }
  const store = await readStore();
  store.sets = recalculateOwnedPieces(store.sets, store.bricks);
  await saveStore(store);
  return { updated: true };
}

export async function updateBrickPurchasePlan(input: { elementId: string; fromSet: string; plannedLegoQuantity: number; plannedBricklinkQuantity: number }): Promise<{ updated: boolean }> {
  const db = getDb();
  const nextLegoQuantity = Number.isFinite(input.plannedLegoQuantity) ? Math.max(0, Math.floor(input.plannedLegoQuantity)) : 0;
  const nextBricklinkQuantity = Number.isFinite(input.plannedBricklinkQuantity) ? Math.max(0, Math.floor(input.plannedBricklinkQuantity)) : 0;
  const nextTotal = nextLegoQuantity + nextBricklinkQuantity;

  let plannedStore: string | null = null;
  let plannedQuantity: number | null = null;
  let plannedLegoQuantity: number | null = null;
  let plannedBricklinkQuantity: number | null = null;

  if (nextTotal > 0) {
    plannedLegoQuantity = nextLegoQuantity;
    plannedBricklinkQuantity = nextBricklinkQuantity;
    plannedQuantity = nextTotal;
    if (nextLegoQuantity > 0 && nextBricklinkQuantity === 0) plannedStore = "lego";
    else if (nextBricklinkQuantity > 0 && nextLegoQuantity === 0) plannedStore = "bricklink";
  }

  const result = db
    .prepare(
      "UPDATE bricks SET plannedStore = ?, plannedQuantity = ?, plannedLegoQuantity = ?, plannedBricklinkQuantity = ? WHERE elementId = ?"
    )
    .run(plannedStore, plannedQuantity, plannedLegoQuantity, plannedBricklinkQuantity, input.elementId);

  if (result.changes === 0) {
    return { updated: false };
  }
  return { updated: true };
}

export async function updateSetInInventory(input: {
  originalSetNumber: string;
  setNumber: string;
  name: string;
  brand: SetRecord["brand"];
  totalPieces: number;
  image: string;
  homologatedToLego: boolean;
}): Promise<{ updated: boolean; reason?: string }> {
  const store = await readStore();
  const originalSetNumber = input.originalSetNumber.trim();
  const nextSetNumber = input.setNumber.trim();
  const nextName = input.name.trim();
  if (!originalSetNumber || !nextSetNumber || !nextName) {
    return { updated: false, reason: "invalid-data" };
  }
  const targetIndex = store.sets.findIndex((set) => equalsIgnoreCase(set.setNumber, originalSetNumber));
  if (targetIndex < 0) {
    return { updated: false, reason: "set-not-found" };
  }
  const hasCollision = store.sets.some((set, index) => index !== targetIndex && equalsIgnoreCase(set.setNumber, nextSetNumber));
  if (hasCollision) {
    return { updated: false, reason: "duplicate-set-number" };
  }

  const currentSet = store.sets[targetIndex];
  store.sets[targetIndex] = {
    ...currentSet,
    setNumber: nextSetNumber,
    name: nextName,
    brand: input.brand,
    totalPieces: Math.max(1, normalizeNonNegativeInt(input.totalPieces, currentSet.totalPieces)),
    image: input.image.trim() || currentSet.image,
    homologatedToLego: Boolean(input.homologatedToLego)
  };

  if (!equalsIgnoreCase(originalSetNumber, nextSetNumber)) {
    store.bricks = store.bricks.map((brick) => (equalsIgnoreCase(brick.fromSet, originalSetNumber) ? { ...brick, fromSet: nextSetNumber } : brick));
  }

  store.sets = recalculateOwnedPieces(store.sets, store.bricks);
  await saveStore(store);
  return { updated: true };
}

export async function deleteSetFromInventory(setNumber: string): Promise<{ removed: boolean }> {
  const store = await readStore();
  const previousLength = store.sets.length;
  store.sets = store.sets.filter((set) => set.setNumber !== setNumber);
  if (store.sets.length === previousLength) {
    return { removed: false };
  }
  store.bricks = store.bricks.filter((brick) => brick.fromSet !== setNumber);
  store.sets = recalculateOwnedPieces(store.sets, store.bricks);
  await saveStore(store);
  return { removed: true };
}

export async function addBrickToSet(input: { fromSet: string; elementId: string; reference: string; name: string; colorId: number; image: string; required: number; stock: number }): Promise<{ added: boolean; reason?: string }> {
  const store = await readStore();
  const setExists = store.sets.some((set) => set.setNumber === input.fromSet);
  if (!setExists) {
    return { added: false, reason: "Set not found" };
  }
  const reference = input.reference.trim();
  if (!reference) {
    return { added: false, reason: "Invalid data" };
  }
  const alreadyExists = store.bricks.some((brick) => brick.fromSet === input.fromSet && equalsIgnoreCase(brick.elementId, input.elementId));
  if (alreadyExists) {
    return { added: false, reason: "Duplicate piece" };
  }

  const newBrick: BrickRecord = {
    elementId: input.elementId.trim(),
    fromSet: input.fromSet,
    reference,
    name: input.name.trim() || reference,
    colorId: input.colorId,
    image: input.image.trim() || "https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=900&q=80",
    required: Math.max(1, normalizeNonNegativeInt(input.required, 1)),
    stock: normalizeNonNegativeInt(input.stock, 0),
    buyAt: ["lego", "bricklink"]
  };

  store.bricks = [...store.bricks, newBrick];
  store.sets = recalculateOwnedPieces(store.sets, store.bricks);
  await saveStore(store);
  return { added: true };
}

export async function updateBrickInSet(input: { fromSet: string; originalElementId: string; elementId: string; reference: string; name: string; colorId: number; image: string; required: number; stock: number }): Promise<{ updated: boolean; reason?: string }> {
  const store = await readStore();
  const reference = input.reference.trim();
  if (!reference) {
    return { updated: false, reason: "invalid-data" };
  }
  const targetIndex = store.bricks.findIndex((brick) => brick.fromSet === input.fromSet && equalsIgnoreCase(brick.elementId, input.originalElementId));
  if (targetIndex < 0) {
    return { updated: false, reason: "piece-not-found" };
  }
  const hasCollision = store.bricks.some((brick, index) => index !== targetIndex && brick.fromSet === input.fromSet && equalsIgnoreCase(brick.elementId, input.elementId));
  if (hasCollision) {
    return { updated: false, reason: "duplicate-piece" };
  }
  store.bricks[targetIndex] = {
    ...store.bricks[targetIndex],
    elementId: input.elementId.trim(),
    reference,
    name: input.name.trim() || reference,
    colorId: input.colorId,
    image: input.image.trim() || store.bricks[targetIndex].image,
    required: Math.max(1, normalizeNonNegativeInt(input.required, 1)),
    stock: normalizeNonNegativeInt(input.stock, 0)
  };
  store.sets = recalculateOwnedPieces(store.sets, store.bricks);
  await saveStore(store);
  return { updated: true };
}

export async function removeBrickFromSet(input: { fromSet: string; elementId: string }): Promise<{ removed: boolean }> {
  const store = await readStore();
  const previousLength = store.bricks.length;
  store.bricks = store.bricks.filter((brick) => !(brick.fromSet === input.fromSet && equalsIgnoreCase(brick.elementId, input.elementId)));
  if (store.bricks.length === previousLength) {
    return { removed: false };
  }
  store.sets = recalculateOwnedPieces(store.sets, store.bricks);
  await saveStore(store);
  return { removed: true };
}
