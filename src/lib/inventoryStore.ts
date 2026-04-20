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
