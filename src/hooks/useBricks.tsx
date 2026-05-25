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
    const { piece, set: setFilters, status: statusFilter, color: colorFilter } = filters

    for (const brick of bricks) {
      const existing = brickGroups.get(brick.elementId);
      if (existing) {
        existing.push(brick);
      } else {
        brickGroups.set(brick.elementId, [brick]);
      }
    }

    const groupedBricks: GroupedBrick[] = [];
    for (const [_, group] of brickGroups) {
      const first = group[0];
      const totalRequired = group.reduce((acc, b) => acc + b.required, 0);
      const totalStock = group.reduce((acc, b) => acc + b.stock, 0);
      const needed = Math.max(0, totalRequired - totalStock);
      groupedBricks.push({
        elementId: first.elementId,
        reference: first.reference,
        name: first.name,
        colorId: first.colorId,
        colorName: (first as Record<string, unknown>).colorName as string ?? "Unknown",
        colorHex: (first as Record<string, unknown>).colorHex as string ?? "#000000",
        image: first.image,
        totalRequired,
        totalStock,
        needed,
        sets: group.map((b) => ({ setNumber: b.fromSet, required: b.required, stock: b.stock }))
      });
    }

    const normalizedPieceFilter = piece.toLowerCase();
    const filteredBricks = groupedBricks.filter((group) => {
      const matchesPiece = !normalizedPieceFilter || group.reference.toLowerCase().includes(normalizedPieceFilter) || group.name.toLowerCase().includes(normalizedPieceFilter) || group.elementId.toLowerCase().includes(normalizedPieceFilter);
      const matchesSet = setFilters.length === 0 || group.sets.some((s) => setFilters.includes(s.setNumber));
      const matchesStatus = statusFilter === "all" || (statusFilter === "missing" ? group.needed > 0 : group.needed === 0);
      const matchesColor = colorFilter.length === 0 || colorFilter.includes(String(group.colorId));
      return matchesPiece && matchesSet && matchesStatus && matchesColor;
    });

    filteredBricks.sort((a, b) => {
      const refCompare = a.reference.localeCompare(b.reference, undefined, { numeric: true });
      if (refCompare !== 0) return refCompare;
      return a.colorId - b.colorId;
    });

    setFilteredBricks(filteredBricks);
    refreshBrickStats(filteredBricks);
  }, [bricks, filters])

  return filteredBricks;
}