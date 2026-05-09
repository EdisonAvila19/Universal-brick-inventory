import { useStore } from '@nanostores/preact';
import { $brickStats } from '@stores/storage-bricks';

interface PieceCountIndicatorProps {
  Count: "Unique" | "Missing";
  Label: string;
  FontColors: {
    Count: string;
    Label: string;
  };
}

export default function PieceCountIndicator({ Count, Label, FontColors }: Readonly<PieceCountIndicatorProps>) {
  const brickStats = useStore($brickStats);

  return (
    <div className="flex flex-col">
      <span className={`text-4xl tracking-tighter ${FontColors.Count}`}>{brickStats[Count]}</span>
      <span className={`text-[10px] uppercase font-bold tracking-widest ${FontColors.Label}`}>{Label}</span>
    </div>
  )
}