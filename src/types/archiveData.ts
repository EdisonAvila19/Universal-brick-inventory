export type Brand = "LEGO" | "Mould King" | "CaDA" | "Other";
export type PurchaseStore = "lego" | "bricklink";
export type ActiveView = "dashboard" | "catalog" | "bricks" | "shopping" | "spare-parts" | "";

export interface SetRecord {
  id: string;
  setNumber: string;
  name: string;
  brand: Brand;
  totalPieces: number;
  ownedPieces: number;
  image: string;
  source: "rebrickable" | "manual";
  homologatedToLego: boolean;
}

export interface BrickRecord {
  elementId: string;
  reference: string;
  name: string;
  colorId: number;
  colorName?: string;
  colorHex?: string;
  image: string;
  required: number;
  stock: number;
  buyAt: PurchaseStore[];
  plannedStore?: PurchaseStore;
  plannedQuantity?: number;
  plannedLegoQuantity?: number;
  plannedBricklinkQuantity?: number;
  fromSet: string;
  spareQuantity?: number;
}

export interface SetBrickRecord {
  fromSet: string;
  elementId: string;
  required: number;
  stock: number;
}

export interface ManualSetInput {
  name: string;
  setNumber: string;
  brand: Exclude<Brand, "LEGO">;
  totalPieces: number;
  image?: string;
  homologatedToLego: boolean;
}

export interface GroupedBrick {
  elementId: string;
  reference: string;
  name: string;
  colorId: number;
  colorName: string;
  colorHex: string;
  image: string;
  totalRequired: number;
  totalStock: number;
  needed: number;
  sets: { setNumber: string; required: number; stock: number }[];
}

export interface SpareBrickRecord {
  elementId: string;
  reference: string;
  name: string;
  colorId: number;
  colorName?: string;
  colorHex?: string;
  image: string;
  spareQuantity: number;
  buyAt: PurchaseStore[];
}

export interface ArchiveColor {
  id: number;
  name: string;
  rgb: string;
}