import { useEffect, useState } from "preact/hooks";
import { useStore } from '@nanostores/preact';

import type { BrickRecord, SetRecord } from "@/types/archiveData";
import { GetNewBricksForSet } from '@utils/bricksData';
import { $bricks } from '@stores/storage-bricks'

export function useSetStore (activeSetNumber: string, sets: SetRecord[], setSelectedSet: (set: SetRecord | null) => void)  {
  const fullBricks = useStore($bricks);
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

  useEffect(() => {
    const selectedSet = sets.find((set) => set.setNumber === activeSetNumber) ?? null;
    setSelectedSet(selectedSet);
    if (!activeSetNumber) return;
    fetchBricks();
  }, [sets])

  useEffect(() => {
    setTotalRequired(setBricks.reduce((acc, brick) => acc + brick.required, 0));
    setTotalOwned(setBricks.reduce((acc, brick) => acc + Math.min(brick.required, brick.stock), 0));
  }, [setBricks])

  useEffect(() => {
    fetchBricks();
  }, [fullBricks])

  return { fetchBricks, totalRequired, totalOwned, bricks: setBricks, setBricks: setSetBricks, loading };
}