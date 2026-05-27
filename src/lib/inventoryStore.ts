import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { BrickRecord, PurchaseStore, SetRecord, ArchiveColor, SpareBrickRecord, DesignGroup, DesignGroupMember } from "@/types/archiveData";
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
        source TEXT NOT NULL
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
    const hasBrickId = existingBrickColumns.some((c) => c.name === "brickId");
    const isOldSchema = existingBrickColumns.some((c) => c.name === "fromSet");

    if (!hasBrickId) {
      if (isOldSchema) {
        database.exec(`
          CREATE TABLE IF NOT EXISTS bricks_new (
            brickId TEXT PRIMARY KEY,
            elementId TEXT NOT NULL DEFAULT '-',
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
            brickId TEXT NOT NULL,
            required INTEGER NOT NULL,
            stock INTEGER NOT NULL,
            PRIMARY KEY (setNumber, brickId)
          )
        `);
        database.exec("BEGIN");
        try {
          database.exec(`
            INSERT OR IGNORE INTO bricks_new (brickId, elementId, reference, name, colorId, image, buyAt, plannedStore, plannedQuantity, plannedLegoQuantity, plannedBricklinkQuantity, spareQuantity)
            SELECT reference || '-' || colorId, elementId, reference, name, colorId, image, buyAt, plannedStore, plannedQuantity, plannedLegoQuantity, plannedBricklinkQuantity, COALESCE(spareQuantity, 0) FROM bricks
          `);
          database.exec(`
            INSERT INTO set_bricks (setNumber, brickId, required, stock)
            SELECT b.fromSet, b.reference || '-' || b.colorId, b.required, b.stock FROM bricks b
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
          CREATE TABLE IF NOT EXISTS bricks_new (
            brickId TEXT PRIMARY KEY,
            elementId TEXT NOT NULL DEFAULT '-',
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
          CREATE TABLE IF NOT EXISTS set_bricks_new (
            setNumber TEXT NOT NULL,
            brickId TEXT NOT NULL,
            required INTEGER NOT NULL,
            stock INTEGER NOT NULL,
            PRIMARY KEY (setNumber, brickId)
          )
        `);
        database.exec("BEGIN");
        try {
          database.exec(`
            INSERT OR IGNORE INTO bricks_new (brickId, elementId, reference, name, colorId, image, buyAt, plannedStore, plannedQuantity, plannedLegoQuantity, plannedBricklinkQuantity, spareQuantity)
            SELECT reference || '-' || colorId, elementId, reference, name, colorId, image, buyAt, plannedStore, plannedQuantity, plannedLegoQuantity, plannedBricklinkQuantity, COALESCE(spareQuantity, 0) FROM bricks
          `);
          database.exec(`
            INSERT INTO set_bricks_new (setNumber, brickId, required, stock)
            SELECT sb.setNumber, b.reference || '-' || b.colorId, sb.required, sb.stock
            FROM set_bricks sb
            INNER JOIN bricks b ON b.elementId = sb.elementId
          `);
          database.exec("DROP TABLE bricks");
          database.exec("ALTER TABLE bricks_new RENAME TO bricks");
          database.exec("DROP TABLE set_bricks");
          database.exec("ALTER TABLE set_bricks_new RENAME TO set_bricks");
          database.exec("COMMIT");
        } catch (err) {
          database.exec("ROLLBACK");
          throw err;
        }
      }

      const brickColumns = database
        .prepare("PRAGMA table_info(bricks)")
        .all() as Array<{ name: string }>;
      if (!brickColumns.some((c) => c.name === "spareQuantity")) {
        database.exec("ALTER TABLE bricks ADD COLUMN spareQuantity INTEGER NOT NULL DEFAULT 0");
      }
    }

    const colorColumns = database.prepare("PRAGMA table_info(colors)").all() as Array<{ name: string }>;
    if (!colorColumns.some((c) => c.name === "color_group_id")) {
      database.exec("ALTER TABLE colors ADD COLUMN color_group_id INTEGER REFERENCES colors(id)");
    }

    const groupColumns = database.prepare("PRAGMA table_info(design_groups)").all() as Array<{ name: string }>;
    if (groupColumns.some((c) => c.name === "name")) {
      database.exec("DROP TABLE IF EXISTS design_groups");
    }
    database.exec(`
      CREATE TABLE IF NOT EXISTS design_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT
      )
    `);

    const brickColumnsAfterMigration = database.prepare("PRAGMA table_info(bricks)").all() as Array<{ name: string }>;
    if (!brickColumnsAfterMigration.some((c) => c.name === "design_group_id")) {
      database.exec("ALTER TABLE bricks ADD COLUMN design_group_id INTEGER REFERENCES design_groups(id)");
    }
  }
  return database;
}

function toBoolean(value: unknown) {
  return Number(value) === 1;
}

function resolveColorGroup(colorId: number): number {
  const db = getDb();
  const color = db.prepare("SELECT color_group_id FROM colors WHERE id = ?").get(colorId) as { color_group_id: number | null } | undefined;
  if (color && color.color_group_id != null) {
    return color.color_group_id;
  }
  return colorId;
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
  const rows = db.prepare("SELECT id, name, rgb, color_group_id FROM colors ORDER BY name ASC").all() as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    rgb: String(row.rgb),
    colorGroupId: row.color_group_id != null ? Number(row.color_group_id) : undefined
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
  db.prepare("UPDATE colors SET color_group_id = NULL WHERE color_group_id = ?").run(id);
  const result = db.prepare("DELETE FROM colors WHERE id = ?").run(id);
  if (result.changes === 0) {
    return { deleted: false, reason: "not-found" };
  }
  return { deleted: true };
}

export async function createColorGroup(mainColorId: number): Promise<{ created: boolean; reason?: string }> {
  const db = getDb();
  const color = db.prepare("SELECT id FROM colors WHERE id = ?").get(mainColorId) as { id: number } | undefined;
  if (!color) {
    return { created: false, reason: "color-not-found" };
  }
  const existing = db.prepare("SELECT color_group_id FROM colors WHERE id = ?").get(mainColorId) as { color_group_id: number | null };
  if (existing.color_group_id != null) {
    return { created: false, reason: "already-in-group" };
  }
  db.prepare("UPDATE colors SET color_group_id = ? WHERE id = ?").run(mainColorId, mainColorId);
  return { created: true };
}

export async function assignColorToGroup(colorId: number, groupId: number): Promise<{ assigned: boolean; reason?: string }> {
  const db = getDb();
  const color = db.prepare("SELECT id FROM colors WHERE id = ?").get(colorId) as { id: number } | undefined;
  if (!color) {
    return { assigned: false, reason: "color-not-found" };
  }
  const leader = db.prepare("SELECT id FROM colors WHERE id = ? AND color_group_id = ?").get(groupId, groupId) as { id: number } | undefined;
  if (!leader) {
    return { assigned: false, reason: "not-a-group-leader" };
  }
  db.prepare("UPDATE colors SET color_group_id = ? WHERE id = ?").run(groupId, colorId);
  return { assigned: true };
}

export async function deleteColorGroup(mainColorId: number): Promise<{ deleted: boolean; reason?: string }> {
  const db = getDb();
  const color = db.prepare("SELECT color_group_id FROM colors WHERE id = ?").get(mainColorId) as { color_group_id: number | null } | undefined;
  if (!color || color.color_group_id == null) {
    return { deleted: false, reason: "not-a-group" };
  }

  const groupMembers = db.prepare("SELECT id FROM colors WHERE color_group_id = ? OR id = ?").all(mainColorId, mainColorId) as { id: number }[];
  const groupColorIds = new Set(groupMembers.map((m) => m.id));

  db.prepare("UPDATE colors SET color_group_id = NULL WHERE color_group_id = ?").run(mainColorId);

  const orphanedBricks = db.prepare(`
    SELECT sb.setNumber, sb.brickId, sb.stock, b.reference, b.colorId,
           b.elementId, b.name, b.image, b.buyAt
    FROM set_bricks sb
    INNER JOIN bricks b ON b.brickId = sb.brickId
    WHERE sb.required = 0
  `).all() as Array<{ setNumber: string; brickId: string; stock: number; reference: string; colorId: number; elementId: string; name: string; image: string; buyAt: string }>;

  const affectedSets = new Set<string>();
  for (const brick of orphanedBricks) {
    if (!groupColorIds.has(brick.colorId)) continue;
    if (brick.stock <= 0) continue;

    const existingSpare = db.prepare("SELECT brickId FROM bricks WHERE brickId = ?").get(brick.brickId) as { brickId: string } | undefined;
    if (existingSpare) {
      db.prepare("UPDATE bricks SET spareQuantity = spareQuantity + ? WHERE brickId = ?").run(brick.stock, brick.brickId);
    } else {
      db.prepare(`
        INSERT INTO bricks (brickId, elementId, reference, name, colorId, image, buyAt, spareQuantity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(brick.brickId, brick.elementId, brick.reference, brick.name, brick.colorId, brick.image, JSON.stringify(["lego", "bricklink"]), brick.stock);
    }

    db.prepare("DELETE FROM set_bricks WHERE setNumber = ? AND brickId = ?").run(brick.setNumber, brick.brickId);
    affectedSets.add(brick.setNumber);
  }

  for (const setNumber of affectedSets) {
    const ownedResult = db.prepare(`
      SELECT COALESCE(SUM(g.min_stock_required), 0) AS owned
      FROM (
        SELECT MIN(CASE WHEN sb.stock < sb.required THEN sb.stock ELSE sb.required END) AS min_stock_required
        FROM set_bricks sb
        INNER JOIN bricks b ON b.brickId = sb.brickId
        LEFT JOIN colors c ON b.colorId = c.id
        WHERE sb.setNumber = ?
        GROUP BY COALESCE(b.design_group_id, b.reference), COALESCE(c.color_group_id, b.colorId)
      ) g
    `).get(setNumber) as { owned: number };
    const setInfo = db.prepare("SELECT totalPieces FROM sets WHERE setNumber = ?").get(setNumber) as { totalPieces: number };
    const newOwned = Math.min(Number(ownedResult.owned), Number(setInfo.totalPieces));
    db.prepare("UPDATE sets SET ownedPieces = ? WHERE setNumber = ?").run(newOwned, setNumber);
  }

  return { deleted: true };
}

export async function unassignColorFromGroup(colorId: number): Promise<{ unassigned: boolean; reason?: string }> {
  const db = getDb();
  const color = db.prepare("SELECT color_group_id FROM colors WHERE id = ?").get(colorId) as { color_group_id: number | null } | undefined;
  if (!color) {
    return { unassigned: false, reason: "color-not-found" };
  }
  if (color.color_group_id == null) {
    return { unassigned: false, reason: "not-in-group" };
  }
  db.prepare("UPDATE colors SET color_group_id = NULL WHERE id = ?").run(colorId);

  const orphanedBricks = db.prepare(`
    SELECT sb.setNumber, sb.brickId, sb.stock, b.reference, b.colorId,
           b.elementId, b.name, b.image, b.buyAt
    FROM set_bricks sb
    INNER JOIN bricks b ON b.brickId = sb.brickId
    WHERE sb.required = 0 AND b.colorId = ?
  `).all(colorId) as Array<{ setNumber: string; brickId: string; stock: number; reference: string; colorId: number; elementId: string; name: string; image: string; buyAt: string }>;

  const affectedSets = new Set<string>();
  for (const brick of orphanedBricks) {
    if (brick.stock <= 0) continue;

    const existingSpare = db.prepare("SELECT brickId FROM bricks WHERE brickId = ?").get(brick.brickId) as { brickId: string } | undefined;
    if (existingSpare) {
      db.prepare("UPDATE bricks SET spareQuantity = spareQuantity + ? WHERE brickId = ?").run(brick.stock, brick.brickId);
    } else {
      db.prepare(`
        INSERT INTO bricks (brickId, elementId, reference, name, colorId, image, buyAt, spareQuantity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(brick.brickId, brick.elementId, brick.reference, brick.name, brick.colorId, brick.image, JSON.stringify(["lego", "bricklink"]), brick.stock);
    }

    db.prepare("DELETE FROM set_bricks WHERE setNumber = ? AND brickId = ?").run(brick.setNumber, brick.brickId);
    affectedSets.add(brick.setNumber);
  }

  for (const setNumber of affectedSets) {
    const ownedResult = db.prepare(`
      SELECT COALESCE(SUM(g.min_stock_required), 0) AS owned
      FROM (
        SELECT MIN(CASE WHEN sb.stock < sb.required THEN sb.stock ELSE sb.required END) AS min_stock_required
        FROM set_bricks sb
        INNER JOIN bricks b ON b.brickId = sb.brickId
        LEFT JOIN colors c ON b.colorId = c.id
        WHERE sb.setNumber = ?
        GROUP BY COALESCE(b.design_group_id, b.reference), COALESCE(c.color_group_id, b.colorId)
      ) g
    `).get(setNumber) as { owned: number };
    const setInfo = db.prepare("SELECT totalPieces FROM sets WHERE setNumber = ?").get(setNumber) as { totalPieces: number };
    const newOwned = Math.min(Number(ownedResult.owned), Number(setInfo.totalPieces));
    db.prepare("UPDATE sets SET ownedPieces = ? WHERE setNumber = ?").run(newOwned, setNumber);
  }

  return { unassigned: true };
}

async function readStore(): Promise<InventoryPayload> {
  await ensureStore();
  const db = getDb();
  const sets = db.prepare("SELECT id, setNumber, name, brand, totalPieces, ownedPieces, image, source FROM sets ORDER BY rowid ASC").all() as Array<Record<string, unknown>>;
  const bricks = db.prepare(`
    SELECT b.brickId, b.elementId, b.reference, b.name, b.colorId, b.image, b.buyAt,
           b.plannedStore, b.plannedQuantity, b.plannedLegoQuantity, b.plannedBricklinkQuantity,
           b.spareQuantity, b.design_group_id AS designGroupId,
           sb.setNumber AS fromSet, sb.required, sb.stock,
           c.name AS colorName, c.rgb AS colorHex, c.color_group_id AS colorGroupId
    FROM bricks b
    INNER JOIN set_bricks sb ON sb.brickId = b.brickId
    LEFT JOIN colors c ON b.colorId = c.id
    ORDER BY
      CASE WHEN b.design_group_id IS NULL THEN 1 ELSE 0 END,
      b.design_group_id,
      b.colorId,
      b.reference
  `).all() as Array<Record<string, unknown>>;
  return {
    sets: sets as SetRecord[],
    bricks: bricks.map((brick) => ({ ...brick, buyAt: parseBuyAt(String(brick.buyAt ?? "[]")) })) as BrickRecord[]
  };
}

async function saveStore(payload: InventoryPayload) {
  const db = getDb();

  const designGroupMap = new Map<string, number>();
  const existingDesignGroups = db.prepare("SELECT brickId, design_group_id FROM bricks WHERE design_group_id IS NOT NULL").all() as Array<{ brickId: string; design_group_id: number }>;
  for (const row of existingDesignGroups) {
    designGroupMap.set(row.brickId, row.design_group_id);
  }

  db.exec("BEGIN");
  try {
    const spareOnly = db.prepare(`
      SELECT brickId, elementId, reference, name, colorId, image, buyAt, spareQuantity,
             plannedStore, plannedQuantity, plannedLegoQuantity, plannedBricklinkQuantity
      FROM bricks WHERE spareQuantity > 0
    `).all() as Array<Record<string, unknown>>;
    const payloadBrickIds = new Set(payload.bricks.map((b) => b.brickId));
    const trulySpareOnly = spareOnly.filter((s) => !payloadBrickIds.has(s.brickId as string));

    db.exec("DELETE FROM set_bricks; DELETE FROM bricks; DELETE FROM sets;");
    const insertSet = db.prepare("INSERT INTO sets (id, setNumber, name, brand, totalPieces, ownedPieces, image, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    const insertBrick = db.prepare("INSERT OR IGNORE INTO bricks (brickId, elementId, reference, name, colorId, image, buyAt, plannedStore, plannedQuantity, plannedLegoQuantity, plannedBricklinkQuantity, spareQuantity, design_group_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const insertSetBrick = db.prepare("INSERT INTO set_bricks (setNumber, brickId, required, stock) VALUES (?, ?, ?, ?)");
    for (const set of payload.sets) insertSet.run(set.id, set.setNumber, set.name, set.brand, set.totalPieces, set.ownedPieces, set.image, set.source);
    for (const brick of payload.bricks) {
      insertBrick.run(brick.brickId, brick.elementId ?? "-", brick.reference, brick.name, brick.colorId, brick.image, JSON.stringify(brick.buyAt), brick.plannedStore ?? null, brick.plannedQuantity ?? null, brick.plannedLegoQuantity ?? null, brick.plannedBricklinkQuantity ?? null, brick.spareQuantity ?? 0, designGroupMap.get(brick.brickId) ?? null);
      insertSetBrick.run(brick.fromSet, brick.brickId, brick.required, brick.stock);
    }
    for (const spare of trulySpareOnly) {
      insertBrick.run(
        spare.brickId, spare.elementId ?? "-", spare.reference, spare.name, spare.colorId, spare.image,
        spare.buyAt ?? JSON.stringify(["lego", "bricklink"]),
        spare.plannedStore ?? null, spare.plannedQuantity ?? null,
        spare.plannedLegoQuantity ?? null, spare.plannedBricklinkQuantity ?? null,
        Number(spare.spareQuantity), designGroupMap.get(spare.brickId as string) ?? null
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
    const setBricks = bricks.filter((brick) => brick.fromSet === set.setNumber);
    const groupMap = new Map<string, { totalStock: number; totalRequired: number }>();
    for (const brick of setBricks) {
      const effectiveColorId = brick.colorGroupId ?? brick.colorId;
      const designKey = brick.designGroupId ?? brick.reference;
      const key = `${designKey}-${effectiveColorId}`;
      const group = groupMap.get(key);
      if (group) {
        group.totalStock += brick.stock;
        group.totalRequired += brick.required;
      } else {
        groupMap.set(key, { totalStock: brick.stock, totalRequired: brick.required });
      }
    }
    const owned = Array.from(groupMap.values())
      .reduce((acc, g) => acc + Math.min(g.totalStock, g.totalRequired), 0);
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
    SELECT b.brickId, b.elementId, b.reference, b.name, b.colorId, b.image, b.buyAt,
           b.plannedStore, b.plannedQuantity, b.plannedLegoQuantity, b.plannedBricklinkQuantity,
           b.design_group_id AS designGroupId,
           c.name AS colorName, c.rgb AS colorHex, c.color_group_id AS colorGroupId
    FROM bricks b
    LEFT JOIN colors c ON b.colorId = c.id
    ORDER BY b.brickId ASC
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

export async function updateBrickStock(input: { brickId: string; fromSet: string; stock: number }): Promise<{ updated: boolean }> {
  const db = getDb();
  const nextStock = Number.isFinite(input.stock) ? Math.max(0, Math.floor(input.stock)) : 0;
  const directResult = db.prepare("UPDATE set_bricks SET stock = ? WHERE setNumber = ? AND brickId = ?").run(nextStock, input.fromSet, input.brickId);
  if (directResult.changes > 0) {
    const store = await readStore();
    store.sets = recalculateOwnedPieces(store.sets, store.bricks);
    await saveStore(store);
    return { updated: true };
  }
  const parts = input.brickId.split('-');
  const effectiveColorId = Number(parts.pop());
  const reference = parts.join('-');
  const matchingBricks = db.prepare(`
    SELECT b.brickId FROM bricks b
    INNER JOIN set_bricks sb ON sb.brickId = b.brickId
    LEFT JOIN colors c ON b.colorId = c.id
    WHERE sb.setNumber = ? AND b.reference = ? AND COALESCE(c.color_group_id, b.colorId) = ?
  `).all(input.fromSet, reference, effectiveColorId) as { brickId: string }[];
  if (matchingBricks.length === 0) {
    return { updated: false };
  }
  for (const { brickId } of matchingBricks) {
    db.prepare("UPDATE set_bricks SET stock = ? WHERE setNumber = ? AND brickId = ?").run(nextStock, input.fromSet, brickId);
  }
  const store = await readStore();
  store.sets = recalculateOwnedPieces(store.sets, store.bricks);
  await saveStore(store);
  return { updated: true };
}

export async function updateBrickPurchasePlan(input: { brickId: string; fromSet: string; plannedLegoQuantity: number; plannedBricklinkQuantity: number }): Promise<{ updated: boolean }> {
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

  const directResult = db
    .prepare("UPDATE bricks SET plannedStore = ?, plannedQuantity = ?, plannedLegoQuantity = ?, plannedBricklinkQuantity = ? WHERE brickId = ?")
    .run(plannedStore, plannedQuantity, plannedLegoQuantity, plannedBricklinkQuantity, input.brickId);

  if (directResult.changes > 0) {
    return { updated: true };
  }

  const parts = input.brickId.split('-');
  const effectiveColorId = Number(parts.pop());
  const reference = parts.join('-');
  const matchingBricks = db.prepare(`
    SELECT brickId FROM bricks b
    LEFT JOIN colors c ON b.colorId = c.id
    WHERE b.reference = ? AND COALESCE(c.color_group_id, b.colorId) = ?
  `).all(reference, effectiveColorId) as { brickId: string }[];

  if (matchingBricks.length === 0) {
    return { updated: false };
  }

  for (const { brickId } of matchingBricks) {
    db.prepare("UPDATE bricks SET plannedStore = ?, plannedQuantity = ?, plannedLegoQuantity = ?, plannedBricklinkQuantity = ? WHERE brickId = ?")
      .run(plannedStore, plannedQuantity, plannedLegoQuantity, plannedBricklinkQuantity, brickId);
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
    image: input.image.trim() || currentSet.image
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

export async function addBrickToSet(input: { fromSet: string; elementId?: string; brickId?: string; reference: string; name: string; colorId: number; image: string; required: number; stock: number }): Promise<{ added: boolean; reason?: string }> {
  const store = await readStore();
  const setExists = store.sets.some((set) => set.setNumber === input.fromSet);
  if (!setExists) {
    return { added: false, reason: "Set not found" };
  }
  const reference = input.reference.trim();
  if (!reference) {
    return { added: false, reason: "Invalid data" };
  }
  const brickId = input.brickId?.trim() || `${reference}-${input.colorId}`;
  const elementId = input.elementId?.trim() || "-";
  const alreadyExists = store.bricks.some((brick) => brick.fromSet === input.fromSet && equalsIgnoreCase(brick.brickId, brickId));
  if (alreadyExists) {
    return { added: false, reason: "Duplicate piece" };
  }

  const newBrick: BrickRecord = {
    brickId,
    elementId,
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

export async function updateBrickInSet(input: { fromSet: string; originalBrickId: string; elementId?: string; reference: string; name: string; colorId: number; image: string; required: number; stock: number }): Promise<{ updated: boolean; reason?: string }> {
  const store = await readStore();
  const reference = input.reference.trim();
  if (!reference) {
    return { updated: false, reason: "invalid-data" };
  }
  const newBrickId = `${reference}-${input.colorId}`;

  const directIndices = store.bricks
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.fromSet === input.fromSet && equalsIgnoreCase(b.brickId, input.originalBrickId))
    .map(({ i }) => i);

  let targetIndices: number[];

  if (directIndices.length > 0) {
    targetIndices = directIndices;
  } else {
    const parts = input.originalBrickId.split('-');
    const effectiveColorId = Number(parts.pop());
    const ref = parts.join('-');
    targetIndices = store.bricks
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => {
        if (b.fromSet !== input.fromSet) return false;
        const brickEffectiveColorId = (b as Record<string, unknown>).colorGroupId ?? b.colorId;
        return b.reference === ref && brickEffectiveColorId === effectiveColorId;
      })
      .map(({ i }) => i);
  }

  if (targetIndices.length === 0) {
    return { updated: false, reason: "piece-not-found" };
  }

  for (const targetIndex of targetIndices) {
    const oldBrickId = store.bricks[targetIndex].brickId;
    if (equalsIgnoreCase(oldBrickId, newBrickId)) continue;
    const hasCollision = store.bricks.some((brick, index) =>
      !targetIndices.includes(index) && brick.fromSet === input.fromSet && equalsIgnoreCase(brick.brickId, newBrickId)
    );
    if (hasCollision) {
      return { updated: false, reason: "duplicate-piece" };
    }
  }

  for (const targetIndex of targetIndices) {
    store.bricks[targetIndex] = {
      ...store.bricks[targetIndex],
      brickId: newBrickId,
      elementId: input.elementId?.trim() || store.bricks[targetIndex].elementId,
      reference,
      name: input.name.trim() || reference,
      colorId: input.colorId,
      image: input.image.trim() || store.bricks[targetIndex].image,
      required: Math.max(0, normalizeNonNegativeInt(input.required, 1)),
      stock: normalizeNonNegativeInt(input.stock, 0)
    };
  }
  store.sets = recalculateOwnedPieces(store.sets, store.bricks);
  await saveStore(store);
  return { updated: true };
}

export async function removeBrickFromSet(input: { fromSet: string; brickId: string }): Promise<{ removed: boolean }> {
  const db = getDb();

  // Try direct match
  let targetBrickId = input.brickId;
  let sbRow = db.prepare("SELECT brickId, required, stock FROM set_bricks WHERE setNumber = ? AND brickId = ?")
    .get(input.fromSet, input.brickId) as { brickId: string; required: number; stock: number } | undefined;

  if (!sbRow) {
    const parts = input.brickId.split('-');
    const effectiveColorId = Number(parts.pop());
    const reference = parts.join('-');
    sbRow = db.prepare(`
      SELECT sb.brickId, sb.required, sb.stock FROM set_bricks sb
      INNER JOIN bricks b ON b.brickId = sb.brickId
      LEFT JOIN colors c ON b.colorId = c.id
      WHERE sb.setNumber = ? AND b.reference = ? AND COALESCE(c.color_group_id, b.colorId) = ?
    `).get(input.fromSet, reference, effectiveColorId) as { brickId: string; required: number; stock: number } | undefined;
    if (!sbRow) return { removed: false };
    targetBrickId = sbRow.brickId;
  }

  db.exec("BEGIN");
  try {
    if (sbRow.required === 0) {
      const existing = db.prepare("SELECT spareQuantity FROM bricks WHERE brickId = ?").get(targetBrickId) as { spareQuantity: number } | undefined;
      const newQty = (existing?.spareQuantity ?? 0) + sbRow.stock;
      db.prepare("UPDATE bricks SET spareQuantity = ? WHERE brickId = ?").run(newQty, targetBrickId);
    }

    db.prepare("DELETE FROM set_bricks WHERE setNumber = ? AND brickId = ?").run(input.fromSet, targetBrickId);

    const ownedResult = db.prepare(`
      SELECT COALESCE(SUM(g.min_stock_required), 0) AS owned
      FROM (
        SELECT MIN(CASE WHEN sb.stock < sb.required THEN sb.stock ELSE sb.required END) AS min_stock_required
        FROM set_bricks sb
        INNER JOIN bricks b ON b.brickId = sb.brickId
        LEFT JOIN colors c ON b.colorId = c.id
        WHERE sb.setNumber = ?
        GROUP BY COALESCE(b.design_group_id, b.reference), COALESCE(c.color_group_id, b.colorId)
      ) g
    `).get(input.fromSet) as { owned: number };
    const setInfo = db.prepare("SELECT totalPieces FROM sets WHERE setNumber = ?").get(input.fromSet) as { totalPieces: number };
    db.prepare("UPDATE sets SET ownedPieces = ? WHERE setNumber = ?").run(
      Math.min(Number(ownedResult.owned), Number(setInfo.totalPieces)), input.fromSet
    );

    db.exec("COMMIT");
    return { removed: true };
  } catch (err) {
    db.exec("ROLLBACK");
    return { removed: false };
  }
}

// --- Spare Parts Functions ---

export async function getSpareBricks(): Promise<SpareBrickRecord[]> {
  await ensureStore();
  const db = getDb();
  const rows = db.prepare(`
    SELECT b.brickId, b.elementId, b.reference, b.name, b.colorId, b.image, b.buyAt,
           b.spareQuantity, b.design_group_id AS designGroupId,
           c.name AS colorName, c.rgb AS colorHex, c.color_group_id AS colorGroupId
    FROM bricks b
    LEFT JOIN colors c ON b.colorId = c.id
    WHERE b.spareQuantity > 0
    ORDER BY
      CASE WHEN b.design_group_id IS NULL THEN 1 ELSE 0 END,
      b.design_group_id,
      b.colorId,
      b.reference
  `).all() as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    ...row,
    buyAt: parseBuyAt(String(row.buyAt ?? "[]")),
    spareQuantity: Number(row.spareQuantity)
  })) as SpareBrickRecord[];
}

export async function addSpareBrick(input: {
  brickId?: string;
  elementId?: string;
  reference: string;
  name: string;
  colorId: number;
  image: string;
  spareQuantity: number;
}): Promise<{ added: boolean; reason?: string }> {
  const db = getDb();
  const reference = input.reference.trim();
  if (!reference) {
    return { added: false, reason: "invalid-data" };
  }
  const brickId = input.brickId?.trim() || `${reference}-${input.colorId}`;
  const elementId = input.elementId?.trim() || "-";
  const existing = db.prepare("SELECT brickId FROM bricks WHERE brickId = ?").get(brickId) as { brickId: string } | undefined;
  const quantity = Math.max(1, normalizeNonNegativeInt(input.spareQuantity, 1));

  if (existing) {
    db.prepare("UPDATE bricks SET spareQuantity = spareQuantity + ? WHERE brickId = ?").run(quantity, brickId);
  } else {
    db.prepare(`
      INSERT INTO bricks (brickId, elementId, reference, name, colorId, image, buyAt, spareQuantity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      brickId,
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

export async function updateSpareQuantity(brickId: string, spareQuantity: number): Promise<{ updated: boolean; reason?: string }> {
  const db = getDb();
  const id = brickId.trim();
  if (!id) return { updated: false, reason: "invalid-data" };
  const quantity = normalizeNonNegativeInt(spareQuantity, 0);
  const result = db.prepare("UPDATE bricks SET spareQuantity = ? WHERE brickId = ?").run(quantity, id);
  if (result.changes === 0) {
    return { updated: false, reason: "not-found" };
  }
  return { updated: true };
}

export async function removeSpareBrick(brickId: string): Promise<{ removed: boolean }> {
  const db = getDb();
  const id = brickId.trim();
  if (!id) return { removed: false };
  const setCount = db.prepare("SELECT COUNT(*) AS total FROM set_bricks WHERE brickId = ?").get(id) as { total: number };
  if (Number(setCount.total) > 0) {
    db.prepare("UPDATE bricks SET spareQuantity = 0 WHERE brickId = ?").run(id);
  } else {
    db.prepare("DELETE FROM bricks WHERE brickId = ?").run(id);
  }
  return { removed: true };
}

export async function assignSpareToSet(input: {
  brickId: string;
  setNumber: string;
  quantity: number;
}): Promise<{ assigned: boolean; reason?: string }> {
  const db = getDb();
  const brickId = input.brickId.trim();
  const setNumber = input.setNumber.trim();
  const quantity = Math.max(1, normalizeNonNegativeInt(input.quantity, 1));

  if (!brickId || !setNumber || quantity < 1) {
    return { assigned: false, reason: "invalid-data" };
  }

  const existingBrick = db.prepare("SELECT spareQuantity FROM bricks WHERE brickId = ?").get(brickId) as { spareQuantity: number } | undefined;
  const setExists = db.prepare("SELECT COUNT(*) AS total FROM sets WHERE setNumber = ?").get(setNumber) as { total: number };
  if (Number(setExists.total) === 0) {
    return { assigned: false, reason: "set-not-found" };
  }

  let actualBrickId = brickId;
  if (existingBrick && existingBrick.spareQuantity >= quantity) {
    db.prepare("UPDATE bricks SET spareQuantity = spareQuantity - ? WHERE brickId = ?").run(quantity, brickId);
    actualBrickId = brickId;
  } else {
    const parts = brickId.split('-');
    const rawColorId = Number(parts.pop());
    const reference = parts.join('-');
    const colorGroup = db.prepare("SELECT color_group_id FROM colors WHERE id = ?").get(rawColorId) as { color_group_id: number | null } | undefined;
    const effectiveColorId = colorGroup?.color_group_id ?? rawColorId;

    let matchingSpares = db.prepare(`
      SELECT brickId, spareQuantity FROM bricks b
      LEFT JOIN colors c ON b.colorId = c.id
      WHERE b.reference = ? AND COALESCE(c.color_group_id, b.colorId) = ? AND b.spareQuantity > 0
    `).all(reference, effectiveColorId) as { brickId: string; spareQuantity: number }[];

    if (matchingSpares.length === 0) {
      const brickGroup = db.prepare("SELECT design_group_id FROM bricks WHERE brickId = ?").get(brickId) as { design_group_id: number | null } | undefined;
      if (brickGroup && brickGroup.design_group_id != null) {
        matchingSpares = db.prepare(`
          SELECT brickId, spareQuantity FROM bricks b
          LEFT JOIN colors c ON b.colorId = c.id
          WHERE b.design_group_id = ? AND COALESCE(c.color_group_id, b.colorId) = ? AND b.spareQuantity > 0
        `).all(brickGroup.design_group_id, effectiveColorId) as { brickId: string; spareQuantity: number }[];
      }
    }

    if (matchingSpares.length === 0) {
      return { assigned: false, reason: "insufficient-spare" };
    }
    let remaining = quantity;
    for (const spare of matchingSpares) {
      const deduct = Math.min(spare.spareQuantity, remaining);
      if (deduct <= 0) continue;
      db.prepare("UPDATE bricks SET spareQuantity = spareQuantity - ? WHERE brickId = ?").run(deduct, spare.brickId);
      remaining -= deduct;
      if (remaining <= 0) {
        actualBrickId = spare.brickId;
      }
    }
    if (remaining > 0) {
      return { assigned: false, reason: "insufficient-spare" };
    }
  }

  const existingSb = db.prepare("SELECT stock FROM set_bricks WHERE setNumber = ? AND brickId = ?").get(setNumber, actualBrickId) as { stock: number } | undefined;
  if (existingSb) {
    db.prepare("UPDATE set_bricks SET stock = stock + ? WHERE setNumber = ? AND brickId = ?").run(quantity, setNumber, actualBrickId);
  } else {
    const parts = actualBrickId.split('-');
    const rawColorId = Number(parts.pop());
    const reference = parts.join('-');
    const actualColorGroup = db.prepare("SELECT color_group_id FROM colors WHERE id = ?").get(rawColorId) as { color_group_id: number | null } | undefined;
    const effectiveColorId = actualColorGroup?.color_group_id ?? rawColorId;
    const actualDesignGroup = db.prepare("SELECT design_group_id FROM bricks WHERE brickId = ?").get(actualBrickId) as { design_group_id: number | null } | undefined;
    const existingEffective = db.prepare(`
      SELECT sb.brickId FROM set_bricks sb
      INNER JOIN bricks b ON b.brickId = sb.brickId
      LEFT JOIN colors c ON b.colorId = c.id
      WHERE sb.setNumber = ? AND (
            (b.reference = ? AND COALESCE(c.color_group_id, b.colorId) = ?)
        OR  (b.design_group_id IS NOT NULL AND b.design_group_id = ? AND COALESCE(c.color_group_id, b.colorId) = ?)
      ) AND sb.brickId != ?
      LIMIT 1
    `).get(setNumber, reference, effectiveColorId,
      actualDesignGroup?.design_group_id ?? -1, effectiveColorId,
      actualBrickId) as { brickId: string } | undefined;
    if (existingEffective) {
      db.prepare("INSERT INTO set_bricks (setNumber, brickId, required, stock) VALUES (?, ?, 0, ?)").run(setNumber, actualBrickId, quantity);
    } else {
      db.prepare("INSERT INTO set_bricks (setNumber, brickId, required, stock) VALUES (?, ?, ?, ?)").run(setNumber, actualBrickId, quantity, quantity);
    }
  }

  const ownedResult = db.prepare(`
    SELECT COALESCE(SUM(g.min_stock_required), 0) AS owned
    FROM (
      SELECT MIN(CASE WHEN sb.stock < sb.required THEN sb.stock ELSE sb.required END) AS min_stock_required
      FROM set_bricks sb
      INNER JOIN bricks b ON b.brickId = sb.brickId
      LEFT JOIN colors c ON b.colorId = c.id
      WHERE sb.setNumber = ?
      GROUP BY COALESCE(b.design_group_id, b.reference), COALESCE(c.color_group_id, b.colorId)
    ) g
  `).get(setNumber) as { owned: number };
  const setInfo = db.prepare("SELECT totalPieces FROM sets WHERE setNumber = ?").get(setNumber) as { totalPieces: number };
  const newOwned = Math.min(Number(ownedResult.owned), Number(setInfo.totalPieces));
  db.prepare("UPDATE sets SET ownedPieces = ? WHERE setNumber = ?").run(newOwned, setNumber);

  return { assigned: true };
}

// --- Design Group Functions ---

export async function getDesignGroups(): Promise<DesignGroup[]> {
  const db = getDb();
  const groups = db.prepare(`
    SELECT id FROM design_groups ORDER BY id ASC
  `).all() as Array<{ id: number }>;

  const getMembers = db.prepare(`
    SELECT b.reference, b.name, b.image
    FROM bricks b
    WHERE b.design_group_id = ?
    GROUP BY b.reference
    ORDER BY b.reference ASC
  `);

  return groups.map((g) => ({
    id: g.id,
    bricks: getMembers.all(g.id) as DesignGroupMember[]
  }));
}

export async function createDesignGroup(): Promise<{ created: boolean; group?: DesignGroup }> {
  const db = getDb();
  const result = db.prepare("INSERT INTO design_groups DEFAULT VALUES").run();
  const newGroup: DesignGroup = {
    id: Number(result.lastInsertRowid),
    bricks: []
  };
  return { created: true, group: newGroup };
}

export async function deleteDesignGroup(id: number): Promise<{ deleted: boolean; reason?: string }> {
  const db = getDb();
  db.exec("BEGIN");
  try {
    db.prepare("UPDATE bricks SET design_group_id = NULL WHERE design_group_id = ?").run(id);
    db.prepare("DELETE FROM design_groups WHERE id = ?").run(id);
    db.exec("COMMIT");
    return { deleted: true };
  } catch {
    db.exec("ROLLBACK");
    return { deleted: false, reason: "db-error" };
  }
}

export async function assignReferenceToDesignGroup(reference: string, groupId: number): Promise<{ assigned: boolean; reason?: string }> {
  const db = getDb();
  const group = db.prepare("SELECT id FROM design_groups WHERE id = ?").get(groupId);
  if (!group) return { assigned: false, reason: "group-not-found" };

  const hasBrick = db.prepare("SELECT brickId FROM bricks WHERE reference = ? LIMIT 1").get(reference);
  if (!hasBrick) return { assigned: false, reason: "reference-not-found" };

  const existingGroups = db.prepare("SELECT DISTINCT design_group_id FROM bricks WHERE reference = ? AND design_group_id IS NOT NULL").all(reference) as Array<{ design_group_id: number }>;
  const currentGroupId = existingGroups[0]?.design_group_id;
  if (currentGroupId != null) {
    if (currentGroupId !== groupId) return { assigned: false, reason: "already-in-group" };
    return { assigned: true };
  }

  db.prepare("UPDATE bricks SET design_group_id = ? WHERE reference = ?").run(groupId, reference);
  return { assigned: true };
}

export async function unassignReferenceFromDesignGroup(reference: string): Promise<{ unassigned: boolean; reason?: string }> {
  const db = getDb();
  const brick = db.prepare("SELECT design_group_id FROM bricks WHERE reference = ? LIMIT 1").get(reference) as { design_group_id: number | null } | undefined;
  if (!brick) return { unassigned: false, reason: "reference-not-found" };
  if (brick.design_group_id == null) return { unassigned: false, reason: "not-in-group" };

  db.prepare("UPDATE bricks SET design_group_id = NULL WHERE reference = ?").run(reference);
  return { unassigned: true };
}

export async function searchReferencesForDesignGroup(query: string): Promise<DesignGroupMember[]> {
  const db = getDb();
  const pattern = `%${query.trim()}%`;
  const rows = db.prepare(`
    SELECT b.reference, b.name, b.image
    FROM bricks b
    WHERE (b.reference LIKE ? OR b.name LIKE ?)
      AND b.reference NOT IN (SELECT DISTINCT reference FROM bricks WHERE design_group_id IS NOT NULL)
    GROUP BY b.reference
    LIMIT 10
  `).all(pattern, pattern) as Array<{ reference: string; name: string; image: string }>;
  return rows;
}
