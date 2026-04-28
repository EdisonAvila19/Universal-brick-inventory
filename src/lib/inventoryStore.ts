import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BrickRecord, SetRecord } from "../data/archiveData";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "inventory.json");

interface InventoryPayload {
  sets: SetRecord[];
  bricks: BrickRecord[];
}

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(STORE_FILE, "utf-8");
  } catch {
    const initial: InventoryPayload = { sets: [], bricks: [] };
    await writeFile(STORE_FILE, JSON.stringify(initial, null, 2), "utf-8");
  }
}

async function readStore(): Promise<InventoryPayload> {
  await ensureStore();
  const raw = await readFile(STORE_FILE, "utf-8");
  const parsed = JSON.parse(raw) as Partial<InventoryPayload>;
  return {
    sets: Array.isArray(parsed.sets) ? parsed.sets : [],
    bricks: Array.isArray(parsed.bricks) ? parsed.bricks : []
  };
}

async function saveStore(payload: InventoryPayload) {
  await writeFile(STORE_FILE, JSON.stringify(payload, null, 2), "utf-8");
}

function normalizeNonNegativeInt(value: number, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

function normalizeHexColor(value: string) {
  const raw = value.trim();
  if (!raw) return "#000000";
  return raw.startsWith("#") ? raw : `#${raw}`;
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

export async function getInventoryBricks(): Promise<BrickRecord[]> {
  const store = await readStore();
  return store.bricks;
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

export async function updateBrickStock(input: { reference: string; fromSet: string; color: string; stock: number }): Promise<{ updated: boolean }> {
  const store = await readStore();
  const nextStock = Number.isFinite(input.stock) ? Math.max(0, Math.floor(input.stock)) : 0;
  let updated = false;
  store.bricks = store.bricks.map((brick) => {
    const isTarget = brick.reference === input.reference && brick.fromSet === input.fromSet && brick.color === input.color;
    if (!isTarget) return brick;
    updated = true;
    return { ...brick, stock: nextStock };
  });
  if (!updated) {
    return { updated: false };
  }
  store.sets = recalculateOwnedPieces(store.sets, store.bricks);
  await saveStore(store);
  return { updated: true };
}

export async function updateBrickPurchasePlan(input: { reference: string; fromSet: string; color: string; plannedLegoQuantity: number; plannedBricklinkQuantity: number }): Promise<{ updated: boolean }> {
  const store = await readStore();
  const nextLegoQuantity = Number.isFinite(input.plannedLegoQuantity) ? Math.max(0, Math.floor(input.plannedLegoQuantity)) : 0;
  const nextBricklinkQuantity = Number.isFinite(input.plannedBricklinkQuantity) ? Math.max(0, Math.floor(input.plannedBricklinkQuantity)) : 0;
  const nextTotal = nextLegoQuantity + nextBricklinkQuantity;
  let updated = false;
  store.bricks = store.bricks.map((brick) => {
    const isTarget = brick.reference === input.reference && brick.fromSet === input.fromSet && brick.color === input.color;
    if (!isTarget) return brick;
    updated = true;
    if (nextTotal === 0) {
      return {
        ...brick,
        plannedStore: undefined,
        plannedQuantity: undefined,
        plannedLegoQuantity: undefined,
        plannedBricklinkQuantity: undefined
      };
    }
    const normalizedStore = nextLegoQuantity > 0 && nextBricklinkQuantity === 0 ? "lego" : nextBricklinkQuantity > 0 && nextLegoQuantity === 0 ? "bricklink" : undefined;
    return {
      ...brick,
      plannedStore: normalizedStore,
      plannedQuantity: nextTotal,
      plannedLegoQuantity: nextLegoQuantity,
      plannedBricklinkQuantity: nextBricklinkQuantity
    };
  });
  if (!updated) {
    return { updated: false };
  }
  await saveStore(store);
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
  store.sets = recalculateOwnedPieces(store.sets, store.bricks);
  await saveStore(store);
  return { removed: true };
}

export async function addBrickToSet(input: { fromSet: string; reference: string; name: string; color: string; colorHex: string; image: string; required: number; stock: number }): Promise<{ added: boolean; reason?: string }> {
  const store = await readStore();
  const setExists = store.sets.some((set) => set.setNumber === input.fromSet);
  if (!setExists) {
    return { added: false, reason: "set-not-found" };
  }
  const reference = input.reference.trim();
  const color = input.color.trim();
  if (!reference || !color) {
    return { added: false, reason: "invalid-data" };
  }
  const alreadyExists = store.bricks.some((brick) => brick.fromSet === input.fromSet && equalsIgnoreCase(brick.reference, reference) && equalsIgnoreCase(brick.color, color));
  if (alreadyExists) {
    return { added: false, reason: "duplicate-piece" };
  }
  store.bricks = [
    ...store.bricks,
    {
      fromSet: input.fromSet,
      reference,
      name: input.name.trim() || reference,
      color,
      colorHex: normalizeHexColor(input.colorHex),
      image: input.image.trim() || "https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=900&q=80",
      required: Math.max(1, normalizeNonNegativeInt(input.required, 1)),
      stock: normalizeNonNegativeInt(input.stock, 0),
      buyAt: ["lego", "bricklink"]
    }
  ];
  store.sets = recalculateOwnedPieces(store.sets, store.bricks);
  await saveStore(store);
  return { added: true };
}

export async function updateBrickInSet(input: { fromSet: string; originalReference: string; originalColor: string; reference: string; name: string; color: string; colorHex: string; image: string; required: number; stock: number }): Promise<{ updated: boolean; reason?: string }> {
  const store = await readStore();
  const reference = input.reference.trim();
  const color = input.color.trim();
  if (!reference || !color) {
    return { updated: false, reason: "invalid-data" };
  }
  const targetIndex = store.bricks.findIndex((brick) => brick.fromSet === input.fromSet && equalsIgnoreCase(brick.reference, input.originalReference) && equalsIgnoreCase(brick.color, input.originalColor));
  if (targetIndex < 0) {
    return { updated: false, reason: "piece-not-found" };
  }
  const hasCollision = store.bricks.some((brick, index) => index !== targetIndex && brick.fromSet === input.fromSet && equalsIgnoreCase(brick.reference, reference) && equalsIgnoreCase(brick.color, color));
  if (hasCollision) {
    return { updated: false, reason: "duplicate-piece" };
  }
  store.bricks[targetIndex] = {
    ...store.bricks[targetIndex],
    reference,
    name: input.name.trim() || reference,
    color,
    colorHex: normalizeHexColor(input.colorHex),
    image: input.image.trim() || store.bricks[targetIndex].image,
    required: Math.max(1, normalizeNonNegativeInt(input.required, 1)),
    stock: normalizeNonNegativeInt(input.stock, 0)
  };
  store.sets = recalculateOwnedPieces(store.sets, store.bricks);
  await saveStore(store);
  return { updated: true };
}

export async function removeBrickFromSet(input: { fromSet: string; reference: string; color: string }): Promise<{ removed: boolean }> {
  const store = await readStore();
  const previousLength = store.bricks.length;
  store.bricks = store.bricks.filter((brick) => !(brick.fromSet === input.fromSet && equalsIgnoreCase(brick.reference, input.reference) && equalsIgnoreCase(brick.color, input.color)));
  if (store.bricks.length === previousLength) {
    return { removed: false };
  }
  store.sets = recalculateOwnedPieces(store.sets, store.bricks);
  await saveStore(store);
  return { removed: true };
}
