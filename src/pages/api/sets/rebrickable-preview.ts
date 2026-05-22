import { fetchRebrickableSetWithParts } from '@lib/rebrickable';
import { mapRebrickableSetToRecord } from '@lib/setMapper';

function normalizeSetNumber(input: string) {
  const raw = input.trim();
  if (!raw) return "";
  return raw.includes("-") ? raw : `${raw}-1`;
}

export async function GET({ url }: { url: URL }) {
  const setNumber = normalizeSetNumber(url.searchParams.get("set")?.trim() ?? "");
  if (!setNumber) {
    return new Response(JSON.stringify({ success: false, message: "Set number is required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const result = await fetchRebrickableSetWithParts(setNumber);
    const record = mapRebrickableSetToRecord(result.set);
    const partsCount = result.parts.reduce((acc, part) => acc + part.quantity, 0);
    return new Response(JSON.stringify({
      success: true,
      set: {
        setNumber: record.setNumber,
        name: record.name,
        image: record.image,
        totalPieces: record.totalPieces,
      },
      partsCount
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
