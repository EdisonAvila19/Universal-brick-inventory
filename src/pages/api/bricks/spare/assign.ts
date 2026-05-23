import { assignSpareToSet } from "@lib/inventoryStore";

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.formData();
    const elementId = String(body.get("elementId") ?? "").trim();
    const setNumber = String(body.get("setNumber") ?? "").trim();
    const quantity = Number(body.get("quantity") ?? 1);

    if (!elementId || !setNumber) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const result = await assignSpareToSet({ elementId, setNumber, quantity });

    if (!result.assigned) {
      return new Response(JSON.stringify({ error: result.reason || "Failed to assign spare to set" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error assigning spare to set:", error);
    return new Response(JSON.stringify({ error: "Failed to assign spare to set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
