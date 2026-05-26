import { getSpareBricks, addSpareBrick } from "@lib/inventoryStore";

export async function GET() {
  try {
    const spareBricks = await getSpareBricks();
    return new Response(JSON.stringify({ spareBricks }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error fetching spare bricks:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch spare bricks" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.formData();
    const brickId = String(body.get("brickId") ?? "").trim() || undefined;
    const elementId = String(body.get("elementId") ?? "").trim() || undefined;
    const reference = String(body.get("reference") ?? "").trim();
    const name = String(body.get("name") ?? "").trim();
    const colorId = Number(body.get("colorId") ?? 0);
    const image = String(body.get("image") ?? "").trim();
    const spareQuantity = Number(body.get("spareQuantity") ?? 1);

    if (!reference) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const result = await addSpareBrick({ brickId, elementId, reference, name, colorId, image, spareQuantity });

    if (!result.added) {
      return new Response(JSON.stringify({ error: result.reason || "Failed to add spare brick" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error adding spare brick:", error);
    return new Response(JSON.stringify({ error: "Failed to add spare brick" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
