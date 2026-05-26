import { updateFeedback } from "@stores/feedback";
import type { GroupedBrick } from "@/types/archiveData";
import { useState } from 'preact/hooks'
import { useStore } from '@nanostores/preact';
import { updateBrick, fetchBricks } from '@/stores/storage-bricks'
import { $spareBricks, refreshSpareBricks } from '@stores/storage-spare-bricks'
import { assignSpareToSet } from '@/utils/bricksData'

export function SaveStockForm({ group, closeList }: Readonly<{ group: GroupedBrick, closeList: () => void }>) {
  const [status, setStatus] = useState("ok");
  const spareBricks = useStore($spareBricks);

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

  const spare = spareBricks.find((s) => {
    const effectiveColorId = s.colorGroupId ?? s.colorId;
    const effectiveBrickId = `${s.reference}-${effectiveColorId}`;
    return effectiveBrickId === group.brickId;
  });
  const spareQty = spare?.spareQuantity ?? 0;

  const [assigning, setAssigning] = useState<Record<string, boolean>>({});
  const [assignQtys, setAssignQtys] = useState<Record<string, number>>({});

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    
    setStatus("Saving");
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const response = await updateBrick(formData);
      if (response.status === "error") throw new Error(response.message || "Failed to update stock");

      updateFeedback("Stock updated successfully!", "info");
      closeList();
    } catch (err) {
      if (err instanceof Error) {
        updateFeedback(err.message, "error");
      } else {
        updateFeedback(String(err), "error");
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } finally {
      setStatus("ok");
    }
  }

  const handleAssign = async (setNumber: string) => {
    const qty = assignQtys[setNumber] ?? 1;
    if (qty < 1) return;
    setAssigning((prev) => ({ ...prev, [setNumber]: true }));
    const formData = new FormData();
    formData.set("brickId", group.brickId);
    formData.set("setNumber", setNumber);
    formData.set("quantity", String(qty));

    const result = await assignSpareToSet(formData);
    if (result.status === "error") {
      updateFeedback(result.message || "Failed to assign spare", "error");
      setAssigning((prev) => ({ ...prev, [setNumber]: false }));
      return;
    }

    await fetchBricks();
    await refreshSpareBricks();
    updateFeedback(`Assigned ${qty} spare piece(s) to ${setNumber}!`, "info");
    setAssigning((prev) => ({ ...prev, [setNumber]: false }));
  };

  const buttonLabel = status === "ok" 
    ? "Save Stock" 
    : status === "error" 
      ? "Error Saving" : "Saving...";
  
  const currentSpareQty = (() => {
    const s = spareBricks.find((b) => {
      const effectiveColorId = b.colorGroupId ?? b.colorId;
      const effectiveBrickId = `${b.reference}-${effectiveColorId}`;
      return effectiveBrickId === group.brickId;
    });
    return s?.spareQuantity ?? 0;
  })();

  return (
    <div className="mt-3">
      <form onSubmit={handleSubmit}>
        <div data-stock-list class="mt-3 space-y-2 px-2">
          {mergedSets.map((s) => {
            const need = Math.max(0, s.required - s.stock);
            const canAssign = currentSpareQty > 0 && need > 0;
            return (
              <div className="flex items-center gap-2 flex-wrap" key={`${group.brickId}_${s.setNumber}`}>
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider w-16 truncate">{s.setNumber}</label>
                <span className="text-[10px] text-secondary">Req: {s.required}</span>
                <input type="hidden" name={`old_stock_${s.setNumber}`} value={s.stock} />
                <input type="number" data-stock-input={s.setNumber} name={`new_stock_${s.setNumber}`} min="0" value={s.stock} className="w-20 bg-box text-contrast border-none rounded-lg px-2 py-1 text-sm" />
                {canAssign && (
                  <>
                    <span class="text-[9px] text-primary font-bold ml-1">📦</span>
                    <input
                      type="number"
                      min="1"
                      max={Math.min(currentSpareQty, need)}
                      value={assignQtys[s.setNumber] ?? Math.min(currentSpareQty, need)}
                      onInput={(e) => setAssignQtys((prev) => ({ ...prev, [s.setNumber]: Number((e.target as HTMLInputElement).value) }))}
                      class="w-14 bg-box text-contrast border-none rounded-lg px-1 py-1.5 text-xs text-center"
                    />
                    <button
                      onClick={() => handleAssign(s.setNumber)}
                      disabled={assigning[s.setNumber]}
                      class="bg-primary text-white px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 whitespace-nowrap"
                    >
                      {assigning[s.setNumber] ? "..." : "Assign"}
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <input type="hidden" name="brickId" value={group.brickId} />
        <button type="submit" className="w-full bg-primary-container text-primary-container-contrast rounded-lg py-2 mt-3 text-xs font-bold uppercase tracking-wider">{ buttonLabel }</button>
      </form>
    </div>
  )
}
