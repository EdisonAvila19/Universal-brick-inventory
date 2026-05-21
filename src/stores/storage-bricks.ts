import { atom } from 'nanostores';
import type { BrickRecord, GroupedBrick } from '@/types/archiveData';

export const $bricks = atom<BrickRecord[]>([]);
export const $BricksCatalog = atom<BrickRecord[]>([]);
export const $brickStats = atom({ Unique: 0, Missing: 0 });
export const $filters = atom<{ piece: string, set: string[], status: string }>({ piece: "", set: [], status: "all" });

export async function setBricks(bricks: BrickRecord[]) {
  $bricks.set(bricks);
}

export async function getBricks() {
  return $bricks.get();
}

export async function getBricksCatalog() {
  return $BricksCatalog.get();
}

export async function setBricksCatalog() {
  try {
    const response = await fetch('/api/bricks/catalog');
    if (!response.ok) throw new Error("Failed to fetch bricks catalog");

    const { bricks } = await response.json(); 
    console.log("Fetched bricks catalog:", bricks);
    
    $BricksCatalog.set(bricks);
  } catch (error) {
    console.error("Error fetching bricks catalog:", error);
  }
}

export async function refreshBrickStats(groupedBricks: GroupedBrick[]) {
  const totalUniquePieces = groupedBricks.length;
  const missingBricks = groupedBricks.reduce((acc, g) => acc + (g.needed > 0 ? 1 : 0), 0);
  $brickStats.set({ Unique: totalUniquePieces, Missing: missingBricks });
}

export async function fetchBricks() {
  try {
    const response = await fetch('/api/bricks');
    if (!response.ok) throw new Error("Failed to fetch bricks");
    const data: { bricks: BrickRecord[] } = await response.json();
    $bricks.set(data.bricks);
    return ({ status: "ok", message: "Bricks Updated"})
  } catch (error) {
    console.error("Error fetching bricks:", error);
    return ({ status: "error", message: "Failed to fetch bricks" })
  }
}

export async function updateBrick (formData: FormData) {
  try {
    const response = await fetch(`/api/bricks`, {
      method: "PUT",
      body: formData
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "Failed to update stock");

    const { status, message } = await fetchBricks();
    if (status === "error") {
      throw new Error(message);
    } else {
      return ({ status: "ok", message: "Brick stock updated successfully!" });
    }
  } catch (error) {
    console.error("Error updating bricks:", error);
    if (error instanceof Error) {
      return ({ status: "error", message: error.message });
    } else {
      return ({ status: "error", message: String(error) });
    }
  }
}

export async function updateFilters(filters: { piece: string, set: string[], status: string }) {
  $filters.set(filters);
}