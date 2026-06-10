export type Brand = "LEGO" | "Mould King" | "CaDA" | "Other";
export type PurchaseStore = "lego" | "bricklink";
export type ActiveView = "dashboard" | "catalog" | "bricks" | "shopping" | "spare-parts" | "colors" | "design-groups" | "categories" | "brick-catalog" | "";

export interface Category {
  id: number;
  name: string;
}

export interface SetRecord {
  id: string;
  setNumber: string;
  name: string;
  brand: Brand;
  totalPieces: number;
  ownedPieces: number;
  image: string;
  source: "rebrickable" | "manual";
}

export interface BrickRecord {
  brickId: string;
  elementId: string;
  reference: string;
  name: string;
  colorId: number;
  colorGroupId?: number;
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
  designGroupId?: number;
  categories?: Category[];
}

export interface DesignGroupMember {
  reference: string;
  name: string;
  image: string;
}

export interface DesignGroup {
  id: number;
  bricks: DesignGroupMember[];
}

export interface SetBrickRecord {
  fromSet: string;
  brickId: string;
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
}

export interface GroupedBrick {
  brickId: string;
  elementId: string;
  reference: string;
  name: string;
  designGroupId?: number;
  colorId: number;
  colorGroupId?: number;
  colorName: string;
  colorHex: string;
  image: string;
  totalRequired: number;
  totalStock: number;
  needed: number;
  spareQuantity: number;
  categories?: Category[];
  sets: { setNumber: string; required: number; stock: number }[];
}

export interface SpareBrickRecord {
  brickId: string;
  elementId: string;
  reference: string;
  name: string;
  colorId: number;
  colorGroupId?: number;
  colorName?: string;
  colorHex?: string;
  image: string;
  spareQuantity: number;
  buyAt: PurchaseStore[];
  designGroupId?: number;
}

export interface ArchiveColor {
  id: number;
  name: string;
  rgb: string;
  colorGroupId?: number;
}

export interface CatalogVariant {
  brickId: string;
  elementId: string;
  colorId: number;
  colorName?: string;
  colorHex?: string;
  image: string;
}

export interface CatalogEntry {
  reference: string;
  name: string;
  image: string;
  variants: CatalogVariant[];
  categories?: Category[];
}