import { useStore } from '@nanostores/preact';
import type { GroupedBrick } from "@/types/archiveData";
import { BrickStock } from '@components/BrickStock'
import { $spareBricks } from '@stores/storage-spare-bricks';

export default function BrickInfo(group: Readonly<GroupedBrick>) {
  const spareBricks = useStore($spareBricks);
  const spare = spareBricks.find((s) => {
    const effectiveColorId = s.colorGroupId ?? s.colorId;
    const effectiveBrickId = `${s.reference}-${effectiveColorId}`;
    return effectiveBrickId === group.brickId;
  });
  const spareQty = spare?.spareQuantity ?? 0;

  return (
    <article className={`bg-surface-container-lowest p-6 rounded-xl relative overflow-hidden flex flex-col h-full shadow-[0_0_13px_-6px] shadow-contrast ${spareQty > 0 && group.needed > 0 ? 'ring-1 ring-primary/30' : ''}`} data-brick-card>

        <div data-status-pill className={`absolute top-4 right-4 text-[10px] font-bold px-3 py-1 rounded-full uppercase ${group.needed > 0 ? "bg-error-container text-on-error-container" : "bg-tertiary-container text-on-tertiary-container"}`}>
          {group.needed > 0 ? "Missing" : "In Stock"}
        </div>

        <div className="w-full aspect-square bg-box rounded-md mb-6 overflow-hidden">
          <a href={`/bricks/${group.reference}`}>
            <img alt={group.name} class="w-full h-full object-contain p-8 hover:scale-110 transition-transform duration-300" loading="lazy" src={group.image} />
          </a>
        </div>

        <div className="flex flex-col justify-between items-start mb-4">
          <div class='flex justify-between w-full'>
            <div>
              <p class="text-[10px] font-bold text-secondary tracking-widest uppercase">Ref. {group.reference}</p>
              <p class="text-[9px] font-semibold text-tertiary tracking-wider">Brick ID: {group.brickId}</p>
              <p class="text-[9px] font-semibold text-tertiary tracking-wider">Element ID: {group.elementId}</p>
            </div>
            <div class="w-6 h-6 rounded-full border border-contrast-shadow" style={`background:${group.colorHex};`} title={`Color: ${group.colorName}`}></div>
          </div>
          <h3 class="font-bold text-lg leading-tight mt-1">{group.name}</h3>
        </div>

        {spareQty > 0 && (
          <p class="text-[10px] font-bold text-primary flex items-center gap-1 mb-1">
            <span>📦</span> {spareQty} in spare parts
          </p>
        )}

        <p className="text-xs text-secondary mb-2">{group.colorName} · {group.sets.length} set{group.sets.length > 1 ? "s" : ""}</p>

        <div className="flex flex-wrap gap-1 mb-4">
          {group.sets.map((s) => 
            <span class="text-[9px] font-bold bg-surface-container-highest text-secondary px-2 py-0.5 rounded" key={s.setNumber}>{s.setNumber}</span>
          )}
        </div>

        <BrickStock group={group}/>
        
    </article>
  )
}