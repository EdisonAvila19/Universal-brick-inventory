import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { BrickRecord, PurchaseStore, SetRecord, ArchiveColor, SpareBrickRecord } from "@/types/archiveData";
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
          plannedBricklinkQuantity INTEGER,
          spareQuantity INTEGER NOT NULL DEFAULT 0
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
          plannedBricklinkQuantity INTEGER,
          spareQuantity INTEGER NOT NULL DEFAULT 0
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

    const brickColumns = database
      .prepare("PRAGMA table_info(bricks)")
      .all() as Array<{ name: string }>;
    if (!brickColumns.some((c) => c.name === "spareQuantity")) {
      database.exec("ALTER TABLE bricks ADD COLUMN spareQuantity INTEGER NOT NULL DEFAULT 0");
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

export async function addColor(name: string, rgb: string): Promise<{ added: boolean; reason?: string; id?: number }> {
  const db = getDb();
  const trimmedName = name.trim();
  const trimmedRgb = rgb.trim();
  if (!trimmedName || !trimmedRgb) {
    return { added: false, reason: "invalid-data" };
  }
  const normalizedRgb = trimmedRgb.startsWith("#") ? trimmedRgb : `#${trimmedRgb}`;
  const existing = db.prepare("SELECT id FROM colors WHERE name = ?").get(trimmedName) as { id: number } | undefined;
  if (existing) {
    return { added: false, reason: "duplicate-name" };
  }
  const result = db.prepare("INSERT INTO colors (name, rgb) VALUES (?, ?)").run(trimmedName, normalizedRgb);
  return { added: true, id: Number(result.lastInsertRowid) };
}

export async function updateColor(id: number, name: string, rgb: string): Promise<{ updated: boolean; reason?: string }> {
  const db = getDb();
  const trimmedName = name.trim();
  const trimmedRgb = rgb.trim();
  if (!trimmedName || !trimmedRgb) {
    return { updated: false, reason: "invalid-data" };
  }
  const normalizedRgb = trimmedRgb.startsWith("#") ? trimmedRgb : `#${trimmedRgb}`;
  const duplicate = db.prepare("SELECT id FROM colors WHERE name = ? AND id != ?").get(trimmedName, id) as { id: number } | undefined;
  if (duplicate) {
    return { updated: false, reason: "duplicate-name" };
  }
  const result = db.prepare("UPDATE colors SET name = ?, rgb = ? WHERE id = ?").run(trimmedName, normalizedRgb, id);
  if (result.changes === 0) {
    return { updated: false, reason: "not-found" };
  }
  return { updated: true };
}

export async function deleteColor(id: number): Promise<{ deleted: boolean; reason?: string }> {
  const db = getDb();
  const inUse = db.prepare("SELECT COUNT(*) AS total FROM bricks WHERE colorId = ?").get(id) as { total: number };
  if (Number(inUse.total) > 0) {
    return { deleted: false, reason: "in-use" };
  }
  const result = db.prepare("DELETE FROM colors WHERE id = ?").run(id);
  if (result.changes === 0) {
    return { deleted: false, reason: "not-found" };
  }
  return { deleted: true };
}

async function readStore(): Promise<InventoryPayload> {
  await ensureStore();
  const db = getDb();
  const sets = db.prepare("SELECT id, setNumber, name, brand, totalPieces, ownedPieces, image, source, homologatedToLego FROM sets ORDER BY rowid ASC").all() as Array<Record<string, unknown>>;
  const bricks = db.prepare(`
    SELECT b.elementId, b.reference, b.name, b.colorId, b.image, b.buyAt,
           b.plannedStore, b.plannedQuantity, b.plannedLegoQuantity, b.plannedBricklinkQuantity,
           b.spareQuantity,
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
    const spareOnly = db.prepare(`
      SELECT elementId, reference, name, colorId, image, buyAt, spareQuantity,
             plannedStore, plannedQuantity, plannedLegoQuantity, plannedBricklinkQuantity
      FROM bricks WHERE spareQuantity > 0
    `).all() as Array<Record<string, unknown>>;
    const payloadElementIds = new Set(payload.bricks.map((b) => b.elementId));
    const trulySpareOnly = spareOnly.filter((s) => !payloadElementIds.has(s.elementId as string));

    db.exec("DELETE FROM set_bricks; DELETE FROM bricks; DELETE FROM sets;");
    const insertSet = db.prepare("INSERT INTO sets (id, setNumber, name, brand, totalPieces, ownedPieces, image, source, homologatedToLego) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const insertBrick = db.prepare("INSERT OR IGNORE INTO bricks (elementId, reference, name, colorId, image, buyAt, plannedStore, plannedQuantity, plannedLegoQuantity, plannedBricklinkQuantity, spareQuantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const insertSetBrick = db.prepare("INSERT INTO set_bricks (setNumber, elementId, required, stock) VALUES (?, ?, ?, ?)");
    for (const set of payload.sets) insertSet.run(set.id, set.setNumber, set.name, set.brand, set.totalPieces, set.ownedPieces, set.image, set.source, set.homologatedToLego ? 1 : 0);
    for (const brick of payload.bricks) {
      insertBrick.run(brick.elementId, brick.reference, brick.name, brick.colorId, brick.image, JSON.stringify(brick.buyAt), brick.plannedStore ?? null, brick.plannedQuantity ?? null, brick.plannedLegoQuantity ?? null, brick.plannedBricklinkQuantity ?? null, brick.spareQuantity ?? 0);
      insertSetBrick.run(brick.fromSet, brick.elementId, brick.required, brick.stock);
    }
    for (const spare of trulySpareOnly) {
      insertBrick.run(
        spare.elementId, spare.reference, spare.name, spare.colorId, spare.image,
        spare.buyAt ?? JSON.stringify(["lego", "bricklink"]),
        spare.plannedStore ?? null, spare.plannedQuantity ?? null,
        spare.plannedLegoQuantity ?? null, spare.plannedBricklinkQuantity ?? null,
        Number(spare.spareQuantity)
      );
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

// --- Spare Parts Functions ---

export async function getSpareBricks(): Promise<SpareBrickRecord[]> {
  await ensureStore();
  const db = getDb();
  const rows = db.prepare(`
    SELECT b.elementId, b.reference, b.name, b.colorId, b.image, b.buyAt,
           b.spareQuantity, c.name AS colorName, c.rgb AS colorHex
    FROM bricks b
    LEFT JOIN colors c ON b.colorId = c.id
    WHERE b.spareQuantity > 0
    ORDER BY b.reference ASC
  `).all() as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    ...row,
    buyAt: parseBuyAt(String(row.buyAt ?? "[]")),
    spareQuantity: Number(row.spareQuantity)
  })) as SpareBrickRecord[];
}

export async function addSpareBrick(input: {
  elementId: string;
  reference: string;
  name: string;
  colorId: number;
  image: string;
  spareQuantity: number;
}): Promise<{ added: boolean; reason?: string }> {
  const db = getDb();
  const elementId = input.elementId.trim();
  const reference = input.reference.trim();
  if (!elementId || !reference) {
    return { added: false, reason: "invalid-data" };
  }
  const existing = db.prepare("SELECT elementId FROM bricks WHERE elementId = ?").get(elementId) as { elementId: string } | undefined;
  const quantity = Math.max(1, normalizeNonNegativeInt(input.spareQuantity, 1));

  if (existing) {
    db.prepare("UPDATE bricks SET spareQuantity = spareQuantity + ? WHERE elementId = ?").run(quantity, elementId);
  } else {
    db.prepare(`
      INSERT INTO bricks (elementId, reference, name, colorId, image, buyAt, spareQuantity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      elementId,
      reference,
      input.name.trim() || reference,
      input.colorId,
      input.image.trim() || "https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=900&q=80",
      JSON.stringify(["lego", "bricklink"]),
      quantity
    );
  }
  return { added: true };
}

export async function updateSpareQuantity(elementId: string, spareQuantity: number): Promise<{ updated: boolean; reason?: string }> {
  const db = getDb();
  const id = elementId.trim();
  if (!id) return { updated: false, reason: "invalid-data" };
  const quantity = normalizeNonNegativeInt(spareQuantity, 0);
  const result = db.prepare("UPDATE bricks SET spareQuantity = ? WHERE elementId = ?").run(quantity, id);
  if (result.changes === 0) {
    return { updated: false, reason: "not-found" };
  }
  return { updated: true };
}

export async function removeSpareBrick(elementId: string): Promise<{ removed: boolean }> {
  const db = getDb();
  const id = elementId.trim();
  if (!id) return { removed: false };
  const setCount = db.prepare("SELECT COUNT(*) AS total FROM set_bricks WHERE elementId = ?").get(id) as { total: number };
  if (Number(setCount.total) > 0) {
    db.prepare("UPDATE bricks SET spareQuantity = 0 WHERE elementId = ?").run(id);
  } else {
    db.prepare("DELETE FROM bricks WHERE elementId = ?").run(id);
  }
  return { removed: true };
}

export async function assignSpareToSet(input: {
  elementId: string;
  setNumber: string;
  quantity: number;
}): Promise<{ assigned: boolean; reason?: string }> {
  const db = getDb();
  const elementId = input.elementId.trim();
  const setNumber = input.setNumber.trim();
  const quantity = Math.max(1, normalizeNonNegativeInt(input.quantity, 1));

  if (!elementId || !setNumber || quantity < 1) {
    return { assigned: false, reason: "invalid-data" };
  }

  const brick = db.prepare("SELECT spareQuantity FROM bricks WHERE elementId = ?").get(elementId) as { spareQuantity: number } | undefined;
  if (!brick || brick.spareQuantity < quantity) {
    return { assigned: false, reason: "insufficient-spare" };
  }

  const setExists = db.prepare("SELECT COUNT(*) AS total FROM sets WHERE setNumber = ?").get(setNumber) as { total: number };
  if (Number(setExists.total) === 0) {
    return { assigned: false, reason: "set-not-found" };
  }

  db.prepare("UPDATE bricks SET spareQuantity = spareQuantity - ? WHERE elementId = ?").run(quantity, elementId);

  const existingSb = db.prepare("SELECT stock FROM set_bricks WHERE setNumber = ? AND elementId = ?").get(setNumber, elementId) as { stock: number } | undefined;
  if (existingSb) {
    db.prepare("UPDATE set_bricks SET stock = stock + ? WHERE setNumber = ? AND elementId = ?").run(quantity, setNumber, elementId);
  } else {
    db.prepare("INSERT INTO set_bricks (setNumber, elementId, required, stock) VALUES (?, ?, ?, ?)").run(setNumber, elementId, quantity, quantity);
  }

  const ownedResult = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN sb.stock < sb.required THEN sb.stock ELSE sb.required END), 0) AS owned
    FROM set_bricks sb WHERE sb.setNumber = ?
  `).get(setNumber) as { owned: number };
  const setInfo = db.prepare("SELECT totalPieces FROM sets WHERE setNumber = ?").get(setNumber) as { totalPieces: number };
  const newOwned = Math.min(Number(ownedResult.owned), Number(setInfo.totalPieces));
  db.prepare("UPDATE sets SET ownedPieces = ? WHERE setNumber = ?").run(newOwned, setNumber);

  return { assigned: true };
}
