import type { GroupedBrick } from "@/types/archiveData";

export function SaveStockForm({ group }: Readonly<{ group: GroupedBrick }>) {
  const mergedSets = group.sets.reduce<{ setNumber: string; required: number; stock: number }[]>((acc, s) => {
    const existing = acc.find((e) => e.setNumber === s.setNumber);
    if (existing) {
      existing.required += s.required;
      existing.stock += s.stock;
    } else {
      acc.push({ ...s });
    }
    return acc;
  }, []);

  return (
    <div className="mt-3">
      <div data-stock-list class="mt-3 space-y-2 px-2">
        {mergedSets.map((s) => (
          <div className="flex items-center gap-2" key={`${group.brickId}_${s.setNumber}`}>
            <a href={`/sets/${s.setNumber}?q=${group.reference}`} className="text-[10px] font-bold text-secondary uppercase tracking-wider w-16 truncate hover:text-primary transition-colors">{s.setNumber}</a>
            <span className="text-[10px] text-secondary">Req: {s.required}</span>
            <span className="text-[10px] text-secondary">Stock: {s.stock}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
