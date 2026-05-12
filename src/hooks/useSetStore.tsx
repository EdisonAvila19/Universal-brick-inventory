import { useEffect, useState } from "preact/hooks";
import type { BrickRecord, SetRecord } from "@/types/archiveData";
import { GetNewBricksForSet } from '@/utils/bricksData';

export function useSetStore (activeSetNumber: string, initialBricks: BrickRecord[], sets: SetRecord[], setSelectedSet: (set: SetRecord | null) => void)  {
  const [bricks, setBricks] = useState(initialBricks);
  const [totalRequired, setTotalRequired] = useState(initialBricks.reduce((acc, brick) => acc + brick.required, 0));
  const [totalOwned, setTotalOwned] = useState(initialBricks.reduce((acc, brick) => acc + Math.min(brick.required, brick.stock), 0));
  
  const fetchBricks = async () => {
    const newBricks = await GetNewBricksForSet(activeSetNumber)
    setBricks(newBricks);
  }

  useEffect(() => {
    const selectedSet = sets.find((set) => set.setNumber === activeSetNumber) ?? null;
    setSelectedSet(selectedSet);
    if (!activeSetNumber) return;
    fetchBricks();
  }, [sets])

  useEffect(() => {
    setTotalRequired(bricks.reduce((acc, brick) => acc + brick.required, 0));
    setTotalOwned(bricks.reduce((acc, brick) => acc + Math.min(brick.required, brick.stock), 0));
  }, [bricks])

  return { fetchBricks, totalRequired, totalOwned, bricks, setBricks };
}