import { updateFeedback } from "@stores/feedback";
import type { GroupedBrick } from "@/types/archiveData";
import { useState } from 'preact/hooks'
import { updateBrick } from '@/stores/storage-bricks'

export function SaveStockForm({ group, closeList }: Readonly<{ group: GroupedBrick, closeList: () => void }>) {
  const [status, setStatus] = useState("ok");

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

  const buttonLabel = status === "ok" 
    ? "Save Stock" 
    : status === "error" 
      ? "Error Saving" : "Saving...";
  
  return (
      <form className="mt-3" onSubmit={handleSubmit}>
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
  )
}
