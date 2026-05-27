import { useEffect, useRef, useState } from "preact/hooks";

import type { BrickRecord, SetRecord } from "@/types/archiveData";
import { GetNewBricksForSet } from '@utils/bricksData';
import { $bricks } from '@stores/storage-bricks'

export function useSetStore (activeSetNumber: string, sets: SetRecord[], setSelectedSet: (set: SetRecord | null) => void)  {
  const [setBricks, setSetBricks] = useState<BrickRecord[]>([]);
  const [totalRequired, setTotalRequired] = useState(0);
  const [totalOwned, setTotalOwned] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const fetchBricks = async () => {
    setLoading(true);
    const newBricks = await GetNewBricksForSet(activeSetNumber)
    setSetBricks(newBricks);
    setLoading(false);
  }

  const refreshBricks = async () => {
    const newBricks = await GetNewBricksForSet(activeSetNumber)
    setSetBricks(newBricks);
  }

  useEffect(() => {
    const selectedSet = sets.find((set) => set.setNumber === activeSetNumber) ?? null;
    setSelectedSet(selectedSet);
    if (!activeSetNumber) return;
    fetchBricks();
  }, [sets])

  useEffect(() => {
    setTotalRequired(setBricks.reduce((acc, brick) => acc + brick.required, 0));
    const groupMap = new Map<string, { totalStock: number; totalRequired: number }>();
    for (const brick of setBricks) {
      const effectiveColorId = (brick as Record<string, unknown>).colorGroupId ?? brick.colorId;
      const designGroupId = (brick as Record<string, unknown>).designGroupId;
      const designKey = designGroupId ?? brick.reference;
      const key = `${designKey}-${effectiveColorId}`;
      const existing = groupMap.get(key);
      if (existing) {
        existing.totalStock += brick.stock;
        existing.totalRequired += brick.required;
      } else {
        groupMap.set(key, { totalStock: brick.stock, totalRequired: brick.required });
      }
    }
    setTotalOwned(
      Array.from(groupMap.values()).reduce((acc, g) => acc + Math.min(g.totalStock, g.totalRequired), 0)
    );
  }, [setBricks])

  const refreshRef = useRef(refreshBricks);
  refreshRef.current = refreshBricks;

  useEffect(() => {
    const unsub = $bricks.listen(() => {
      if (activeSetNumber) {
        refreshRef.current();
      }
    });
    return () => unsub();
  }, [activeSetNumber]);

  return { fetchBricks, refreshBricks, totalRequired, totalOwned, bricks: setBricks, setBricks: setSetBricks, loading };
}