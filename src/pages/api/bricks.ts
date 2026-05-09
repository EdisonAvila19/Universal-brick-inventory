import { getInventoryBricks, updateBrickStock } from "@lib/inventoryStore";

export async function POST({ request }: { request: Request }) {
  const body = await request.formData();

  const IdRaw = body.get("elementId");
  if (typeof IdRaw !== "string") {
    return new Response(JSON.stringify({ error: "Invalid elementId" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const elementId = IdRaw.trim();
  const fromSet: { setNumber: string; stock: number; oldStock: number; isDifferent: boolean }[] = [];
  body.entries().filter(([key, value]) => key.startsWith("new_stock_")).forEach(([key, value]) => {
    const setNumber = key.replace("new_stock_", "");
    const stock = Number(value);
    const oldStock = Number(body.get(`old_stock_${setNumber}`));
    const isDifferent = stock !== oldStock;

    fromSet.push({ setNumber, stock, oldStock, isDifferent });
  });

  if (!elementId || fromSet.length === 0) {
    return new Response(JSON.stringify({ error: "Invalid input" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const updatedSets = fromSet.filter(set => set.isDifferent)

  if (updatedSets.length === 0) {
    return new Response(JSON.stringify({ ok: false, error: "No changes detected" }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  updatedSets.forEach(async ({ setNumber, stock }) => {
    await updateBrickStock({ elementId, fromSet: setNumber, stock });
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET({ request, }: { request: Request }) {
  const bricks = await getInventoryBricks();

  return new Response(JSON.stringify({ bricks }), {
    headers: { 'Content-Type': 'application/json' },
  });
}