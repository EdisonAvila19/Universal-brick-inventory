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
  const spare = spareBricks.find((s) => s.elementId === group.elementId);
  const spareQty = spare?.spareQuantity ?? 0;

  const [assignSet, setAssignSet] = useState(group.sets[0]?.setNumber ?? "");
  const [assignQty, setAssignQty] = useState(1);
  const [assigning, setAssigning] = useState(false);

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

  const handleAssign = async () => {
    if (!assignSet || assignQty < 1) return;
    setAssigning(true);
    const formData = new FormData();
    formData.set("elementId", group.elementId);
    formData.set("setNumber", assignSet);
    formData.set("quantity", String(assignQty));

    const result = await assignSpareToSet(formData);
    if (result.status === "error") {
      updateFeedback(result.message || "Failed to assign spare", "error");
      setAssigning(false);
      return;
    }

    await fetchBricks();
    await refreshSpareBricks();
    updateFeedback(`Assigned ${assignQty} spare piece(s) to ${assignSet}!`, "info");
    setAssigning(false);
  };

  const buttonLabel = status === "ok" 
    ? "Save Stock" 
    : status === "error" 
      ? "Error Saving" : "Saving...";
  
  return (
    <div className="mt-3">
      <form onSubmit={handleSubmit}>
        <div data-stock-list class="mt-3 space-y-2 px-2">
          {group.sets.map((s) => (
            <div className="flex items-center gap-2" key={`${group.elementId}_${s.setNumber}`}>
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wider w-16 truncate">{s.setNumber}</label>
              <span className="text-[10px] text-secondary">Req: {s.required}</span>
              <input type="hidden" name={`old_stock_${s.setNumber}`} value={s.stock} />
              <input type="number" data-stock-input={s.setNumber} name={`new_stock_${s.setNumber}`} min="0" value={s.stock} className="w-20 bg-box text-contrast border-none rounded-lg px-2 py-1 text-sm" />
            </div>
          ))}
        </div>
        <input type="hidden" name="elementId" value={group.elementId} />
        <button type="submit" className="w-full bg-primary-container text-primary-container-contrast rounded-lg py-2 mt-3 text-xs font-bold uppercase tracking-wider">{ buttonLabel }</button>
      </form>

      {spareQty > 0 && group.needed > 0 && (
        <div class="mt-4 pt-4 border-t border-primary/20">
          <p class="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1">
            <span>📦</span> Assign from spare ({spareQty} available)
          </p>
          <div class="flex items-center gap-2">
            <select
              value={assignSet}
              onChange={(e) => setAssignSet((e.target as HTMLSelectElement).value)}
              class="bg-surface-container-highest border-none rounded-lg px-2 py-1.5 text-xs font-bold flex-1 min-w-0"
            >
              {group.sets.map((s) => (
                <option value={s.setNumber} key={s.setNumber}>{s.setNumber} (need {Math.max(0, s.required - s.stock)})</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              max={Math.min(spareQty, group.needed)}
              value={assignQty}
              onInput={(e) => setAssignQty(Number((e.target as HTMLInputElement).value))}
              class="w-16 bg-surface-container-highest border-none rounded-lg px-2 py-1.5 text-sm text-center"
            />
            <button
              onClick={handleAssign}
              disabled={assigning || assignQty < 1}
              class="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50 whitespace-nowrap"
            >
              {assigning ? "..." : "Assign"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
