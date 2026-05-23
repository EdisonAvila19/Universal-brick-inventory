import { atom } from "nanostores";
import type { SpareBrickRecord } from "@/types/archiveData";
import { fetchSpareBricks as apiFetchSpareBricks } from "@utils/bricksData";

export const $spareBricks = atom<SpareBrickRecord[]>([]);

export async function setSpareBricks(bricks: SpareBrickRecord[]) {
  $spareBricks.set(bricks);
}

export async function refreshSpareBricks() {
  const bricks = await apiFetchSpareBricks();
  $spareBricks.set(bricks);
}
