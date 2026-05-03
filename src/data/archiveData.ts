export type Brand = "LEGO" | "Mould King" | "CaDA" | "Other";
export type PurchaseStore = "lego" | "bricklink";

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
  color: string;
  colorHex: string;
  image: string;
  required: number;
  stock: number;
  buyAt: PurchaseStore[];
  plannedStore?: PurchaseStore;
  plannedQuantity?: number;
  plannedLegoQuantity?: number;
  plannedBricklinkQuantity?: number;
  fromSet: string;
}

export interface ManualSetInput {
  name: string;
  setNumber: string;
  brand: Exclude<Brand, "LEGO">;
  totalPieces: number;
  image?: string;
  homologatedToLego: boolean;
}
