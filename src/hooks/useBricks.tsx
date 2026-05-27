import { useStore } from '@nanostores/preact';
import { useState, useEffect } from 'preact/hooks'
import { $bricks, $filters,refreshBrickStats, setBricks } from '@stores/storage-bricks';
import type { GroupedBrick, BrickRecord } from '@/types/archiveData'

export function useBricks( initialBricks: BrickRecord[] ) {
  const bricks = useStore($bricks);
  const filters = useStore($filters)
  const [filteredBricks, setFilteredBricks] = useState<GroupedBrick[]>([]);

  useEffect(() => {
    setBricks(initialBricks);
  }, []);

  useEffect(() => {
    const brickGroups = new Map<string, (typeof bricks)[number][]>();
    const { piece, set: setFilters, status: statusFilter, color: colorFilter, spareOnly } = filters

    for (const brick of bricks) {
      const effectiveColorId = (brick as Record<string, unknown>).colorGroupId ?? brick.colorId;
      const effectiveBrickId = `${brick.reference}-${effectiveColorId}`;
      const existing = brickGroups.get(effectiveBrickId);
      if (existing) {
        existing.push(brick);
      } else {
        brickGroups.set(effectiveBrickId, [brick]);
      }
    }

    const groupedBricks: GroupedBrick[] = [];
    for (const [_, group] of brickGroups) {
      const first = group[0];
      const totalRequired = group.reduce((acc, b) => acc + b.required, 0);
      const totalStock = group.reduce((acc, b) => acc + b.stock, 0);
      const needed = Math.max(0, totalRequired - totalStock);
      const spareQuantity = group.reduce((max, b) => Math.max(max, b.spareQuantity ?? 0), 0);
      const effectiveColorId = (first as Record<string, unknown>).colorGroupId ?? first.colorId;
      const designGroupId = (first as Record<string, unknown>).designGroupId as number | undefined;
      groupedBricks.push({
        brickId: `${first.reference}-${effectiveColorId}`,
        elementId: first.elementId,
        reference: first.reference,
        designGroupId,
        name: first.name,
        colorId: first.colorId,
        colorGroupId: (first as Record<string, unknown>).colorGroupId as number | undefined,
        colorName: (first as Record<string, unknown>).colorName as string ?? "Unknown",
        colorHex: (first as Record<string, unknown>).colorHex as string ?? "#000000",
        image: first.image,
        totalRequired,
        totalStock,
        needed,
        spareQuantity,
        sets: group.map((b) => ({ setNumber: b.fromSet, required: b.required, stock: b.stock }))
      });
    }

    const normalizedPieceFilter = piece.toLowerCase();
    const filteredBricks = groupedBricks.filter((group) => {
      const matchesPiece = !normalizedPieceFilter || group.reference.toLowerCase().includes(normalizedPieceFilter) || group.name.toLowerCase().includes(normalizedPieceFilter) || group.brickId.toLowerCase().includes(normalizedPieceFilter) || group.elementId.toLowerCase().includes(normalizedPieceFilter);
      const matchesSet = setFilters.length === 0 || group.sets.some((s) => setFilters.includes(s.setNumber));
      const matchesStatus = statusFilter === "all" || (statusFilter === "missing" ? group.needed > 0 : group.needed === 0);
      const matchesColor = colorFilter.length === 0 || colorFilter.includes(String(group.colorId));
      const matchesSpare = !spareOnly || group.spareQuantity > 0;
      return matchesPiece && matchesSet && matchesStatus && matchesColor && matchesSpare;
    });

    const groupMinRef = new Map<number, string>();
    for (const brick of bricks) {
      if (brick.designGroupId != null) {
        const current = groupMinRef.get(brick.designGroupId);
        if (!current || brick.reference.localeCompare(current, undefined, { numeric: true }) < 0) {
          groupMinRef.set(brick.designGroupId, brick.reference);
        }
      }
    }

    filteredBricks.sort((a, b) => {
      const keyA = a.designGroupId != null ? (groupMinRef.get(a.designGroupId) ?? a.reference) : a.reference;
      const keyB = b.designGroupId != null ? (groupMinRef.get(b.designGroupId) ?? b.reference) : b.reference;
      const keyCmp = keyA.localeCompare(keyB, undefined, { numeric: true });
      if (keyCmp !== 0) return keyCmp;

      const inGroupA = a.designGroupId != null;
      const inGroupB = b.designGroupId != null;
      if (inGroupA && inGroupB) {
        if (a.designGroupId !== b.designGroupId) return (a.designGroupId ?? 0) - (b.designGroupId ?? 0);
        const colorCmp = a.colorId - b.colorId;
        if (colorCmp !== 0) return colorCmp;
        return a.reference.localeCompare(b.reference, undefined, { numeric: true });
      }
      if (inGroupA) return -1;
      if (inGroupB) return 1;

      const refCompare = a.reference.localeCompare(b.reference, undefined, { numeric: true });
      if (refCompare !== 0) return refCompare;
      return a.colorId - b.colorId;
    });

    setFilteredBricks(filteredBricks);
    refreshBrickStats(filteredBricks);
  }, [bricks, filters])

  return filteredBricks;
}