import { updateSet } from '@/stores/storage-sets'
import type { SetRecord } from "@/types/archiveData";
import { updateFeedback } from '@/stores/feedback';


export default function SetInfoForm({ selectedSet }: Readonly<{ selectedSet: SetRecord }>) {

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const result = await updateSet(formData);

    if (result.status === "ok") {
      updateFeedback(result.message, "info");
    } else {
      updateFeedback(result.message, "error");
    }

  }

  return (
    <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
      <input type="hidden" name="action" value="update-info" />
      <input type="hidden" name="originalSetNumber" value={selectedSet.setNumber} />
      <input type="hidden" name="totalPieces" value={selectedSet.totalPieces} />
      <input type="hidden" name="homologatedToLego" value={String(selectedSet.homologatedToLego)} />
      <div>
        <label className="block text-[10px] uppercase font-bold text-secondary">
          Set Number{" "}
          <input required name="setNumber" value={selectedSet.setNumber} className="w-full bg-box text-contrast border-none rounded-lg px-3 py-2 text-sm mt-1" />
        </label>
      </div>
      <div>
        <label className="block text-[10px] uppercase font-bold text-secondary">
          Set Name{" "}
          <input required name="name" value={selectedSet.name} className="w-full bg-box text-contrast border-none rounded-lg px-3 py-2 mt-1 text-sm" />
        </label>
      </div>
      <div>
        <label className="block text-[10px] uppercase font-bold text-secondary">
          Brand{" "}
          <select name="brand" className="w-full bg-box text-contrast border-none rounded-lg px-3 py-2 mt-1 text-sm">
            <option value="LEGO" selected={selectedSet.brand === "LEGO"}>LEGO</option>
            <option value="Mould King" selected={selectedSet.brand === "Mould King"}>Mould King</option>
            <option value="CaDA" selected={selectedSet.brand === "CaDA"}>CaDA</option>
            <option value="Other" selected={selectedSet.brand === "Other"}>Other</option>
          </select>
        </label>
      </div>
      <div>
        <label className="block text-[10px] uppercase font-bold text-secondary">
          Image URL{" "}
          <input required type="url" name="image" value={selectedSet.image} className="w-full bg-box text-contrast border-none rounded-lg px-3 py-2 text-sm mt-1" />
        </label>
      </div>
      {/* <label className="md:col-span-2 flex items-center gap-2 text-sm text-secondary">
        <input type="checkbox" name="homologatedToLego" checked={selectedSet.homologatedToLego} className="rounded" />
        {" "}Homologated to LEGO equivalent pieces
      </label> */}
      <div className="md:col-span-2 flex gap-2">
        <button type="submit" className="bg-primary-container text-primary-container-contrast px-6 py-3 rounded-lg font-bold text-sm">Save Set Info</button>
      </div>
    </form>
  )
}