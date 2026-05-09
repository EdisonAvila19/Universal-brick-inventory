import type { BrickRecord, ManualSetInput, SetRecord } from "@/types/archiveData";
import type { RebrickablePart, RebrickableSet } from "@/types/rebrickable";

export function mapRebrickableSetToRecord(set: RebrickableSet): SetRecord {
  return {
    id: `rbk-${set.set_num}`,
    setNumber: set.set_num,
    name: set.name,
    brand: "LEGO",
    totalPieces: set.num_parts,
    ownedPieces: 0,
    image: set.set_img_url ?? "https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=900&q=80",
    source: "rebrickable",
    homologatedToLego: false
  };
}

export function mapManualSetToRecord(input: ManualSetInput): SetRecord {
  return {
    id: `manual-${input.setNumber}`,
    setNumber: input.setNumber,
    name: input.name,
    brand: input.brand,
    totalPieces: input.totalPieces,
    ownedPieces: 0,
    image: input.image ?? "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1000&q=80",
    source: "manual",
    homologatedToLego: input.homologatedToLego
  };
}

export function mapRebrickablePartsToBricks(parts: RebrickablePart[], setNumber: string): BrickRecord[] {
  return parts
    .filter((part) => !part.is_spare)
    .map((part) => ({
      elementId: part.element_id ?? `${part.part.part_num}-${part.color.id}`,
      reference: part.part.part_num,
      name: part.part.name,
      colorId: part.color.id,
      image: part.part.part_img_url ?? "https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=900&q=80",
      required: part.quantity,
      stock: 0,
      buyAt: ["lego", "bricklink"],
      fromSet: setNumber
    }));
}
