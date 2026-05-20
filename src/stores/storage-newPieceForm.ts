import { atom } from 'nanostores';
import type { RebrickablePartColorDetails, RebrickablePartDetails } from '@/types/rebrickable'

export const $displayColors = atom<boolean>(false);
export const $colorBricks = atom<{info: RebrickablePartDetails, colors: RebrickablePartColorDetails[]} | null>(null);

export async function setDisplayColors(newState: boolean) {
  $displayColors.set(newState);
}

export async function setColorBricks(newState: {info: RebrickablePartDetails, colors: RebrickablePartColorDetails[]} | null) {
  $colorBricks.set(newState);
}

export async function resetForm() {
  $displayColors.set(false);
  $colorBricks.set(null);
}
