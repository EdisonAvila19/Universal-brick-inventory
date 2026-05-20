import { useEffect, useState } from "preact/hooks";
import { useStore } from '@nanostores/preact';

import type { BrickRecord, SetRecord } from "@/types/archiveData";
import { GetNewBricksForSet } from '@utils/bricksData';
import { $bricks } from '@stores/storage-bricks'

export function useSetStore (activeSetNumber: string, initialSetBricks: BrickRecord[], sets: SetRecord[], setSelectedSet: (set: SetRecord | null) => void)  {
  const fullBricks = useStore($bricks);
  const [setBricks, setSetBricks] = useState(initialSetBricks);
  const [totalRequired, setTotalRequired] = useState(initialSetBricks.reduce((acc, brick) => acc + brick.required, 0));
  const [totalOwned, setTotalOwned] = useState(initialSetBricks.reduce((acc, brick) => acc + Math.min(brick.required, brick.stock), 0));
  
  const fetchBricks = async () => {
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
    setTotalOwned(setBricks.reduce((acc, brick) => acc + Math.min(brick.required, brick.stock), 0));
  }, [setBricks])

  useEffect(() => {
    fetchBricks();
  }, [fullBricks])

  return { fetchBricks, totalRequired, totalOwned, bricks: setBricks, setBricks: setSetBricks };
}