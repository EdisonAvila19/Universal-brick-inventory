import { addSetToInventory, deleteSetFromInventory, getInventorySets } from '@/lib/inventoryStore'
import { fetchRebrickableSetWithParts } from '@lib/rebrickable';
import { mapManualSetToRecord, mapRebrickablePartsToBricks, mapRebrickableSetToRecord } from '@lib/setMapper';
import type { Brand } from "@/types/archiveData";

function normalizeSetNumber(input: string) {
  const raw = input.trim();
  if (!raw) return "";
  return raw.includes("-") ? raw : `${raw}-1`;
}

export async function POST({ request }: { request: Request }) {
  try {
    const formData = await request.formData();
    const action = String(formData.get("action") ?? "");

    if (action === "add-rebrickable") {
      const setNumber = normalizeSetNumber(String(formData.get("setNumber") ?? ""));
      if (!setNumber) {
        return new Response(JSON.stringify({ success: false, message: "Set number is required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const result = await fetchRebrickableSetWithParts(setNumber);
      const record = mapRebrickableSetToRecord(result.set);
      const brickRecords = mapRebrickablePartsToBricks(result.parts, record.setNumber);
      const saved = await addSetToInventory(record, brickRecords);
      if (!saved.added) {
        return new Response(JSON.stringify({ success: false, message: `Set ${record.setNumber} is already in inventory.` }), { status: 409, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true, setNumber: record.setNumber, message: `Set ${record.setNumber} added — ${brickRecords.length} unique parts catalogued.` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === "add-manual") {
      const name = String(formData.get("name") ?? "").trim();
      const setNumber = String(formData.get("setNumber") ?? "").trim();
      const brand = String(formData.get("brand") ?? "Other") as Exclude<Brand, "LEGO">;
      const totalPieces = Number(formData.get("totalPieces") ?? 0);
      const image = String(formData.get("image") ?? "").trim();
      if (!name || !setNumber) {
        return new Response(JSON.stringify({ success: false, message: "Manual set requires name, set number and total pieces" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const record = mapManualSetToRecord({ name, setNumber, brand, totalPieces, image: image || undefined });
      const saved = await addSetToInventory(record);
      if (!saved.added) {
        return new Response(JSON.stringify({ success: false, message: `Set ${record.setNumber} is already in inventory.` }), { status: 409, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true, setNumber: record.setNumber, message: `Manual set ${record.setNumber} added to inventory.` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: false, message: "Invalid action" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('POST /api/sets error', error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function DELETE({ request }: { request: Request }) {
  const { setNumber } = await request.json();
  
  try {
    const result = await deleteSetFromInventory(setNumber);
    
    if (result.removed) {
      return new Response(JSON.stringify({ message: `Set ${setNumber} removed from inventory.`}), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } else {
      return new Response(JSON.stringify({ message: "Could not remove set." }), { status: 500 });
    }
  } catch (error) {
    console.error('DELETE /api/sets error removing set', setNumber, error);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), { status: 500 });
  }
}

export async function GET({ request }: { request: Request }) {
  try {
    const sets = await getInventorySets();
    
    return new Response(JSON.stringify(sets), { status: 200 });
  } catch (error) {
    console.error('GET /api/sets error fetching sets', error);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), { status: 500 });
  }
}