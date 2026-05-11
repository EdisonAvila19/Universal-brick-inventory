import type { SetRecord } from '@/types/archiveData';
import { updateFeedback } from '@/stores/feedback';
import { deleteSet } from '@/stores/storage-sets';

export default function SetCard(setData: Readonly<SetRecord>) {

  const progress = Math.round((setData.ownedPieces / setData.totalPieces) * 100);

  const handleDelete = async (e: Event) => {
    e.preventDefault();
    const { status, message } = await deleteSet(setData.setNumber);

    if (status === "ok") {

      updateFeedback(`${message}`, "info");
    } else {
      updateFeedback(`${message}`, "error");
    }
  }

  return (
    <article className="group bg-surface-container-lowest rounded-xl p-4 flex flex-col">
      <div className="relative aspect-square mb-6 overflow-hidden rounded-md bg-surface-container-low">
        <img src={setData.image} alt={setData.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-primary-container text-[#6a5700] text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest">{setData.brand}</span>{setData.homologatedToLego && <span className="bg-tertiary-container text-on-tertiary-container text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Homologated</span>}
        </div>
      </div>
      <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.1em]">Set No. {setData.setNumber}</p>
      <h3 className="text-lg font-bold leading-tight mt-1">{setData.name}</h3>
      <div className="mt-4 space-y-1">
        <div className="flex justify-between text-[10px] font-bold text-secondary uppercase tracking-widest">
          <span>Completion</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-surface-container-low rounded-full overflow-hidden">
          <div className={["h-full", progress === 100 ? "bg-tertiary-container" : "bg-primary-container"].join(' ')} style={{ width: `${progress}%` }}></div>
        </div>
      </div>
      <div className="pt-4 mt-auto">
        {/* <div className="flex gap-2 mb-3">
          <a href={`/bricks?set=${encodeURIComponent(set.setNumber)}`} className="flex-1 text-center bg-surface-container-highest text-on-surface text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-lg">Brick Inventory</a>
          <a href={`/shopping?set=${encodeURIComponent(set.setNumber)}`} className="flex-1 text-center bg-surface-container-highest text-on-surface text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-lg">Shopping List</a>
        </div> */}
        <div className="mb-3">
          <a href={`/set-parts?set=${encodeURIComponent(setData.setNumber)}`} className="w-full inline-flex justify-center bg-surface-container-highest text-on-surface text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-lg">View/Edit Pieces</a>
        </div>
        <div className="mb-3">
          <a href={`/sets/${encodeURIComponent(setData.setNumber)}`} className="w-full inline-flex justify-center bg-surface-container-highest text-on-surface text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-lg">Edit Set Info</a>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-secondary">{setData.totalPieces.toLocaleString()} Pieces</span>
          <form onSubmit={handleDelete}>
            <input type="hidden" name="action" value="delete-set" />
            <input type="hidden" name="setNumber" value={setData.setNumber} />
            <button type="submit" className="text-error text-xs font-bold uppercase tracking-widest">Delete Set</button>
          </form>
        </div>
      </div>
    </article>
  )
}