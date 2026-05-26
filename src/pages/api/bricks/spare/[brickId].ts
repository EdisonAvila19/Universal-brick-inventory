import { updateSpareQuantity, removeSpareBrick } from "@lib/inventoryStore";

export async function PUT({ params, request }: { params: { brickId: string }; request: Request }) {
  try {
    const brickId = params.brickId;
    if (!brickId) {
      return new Response(JSON.stringify({ error: "Brick ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await request.formData();
    const spareQuantity = Number(body.get("spareQuantity") ?? 0);

    const result = await updateSpareQuantity(brickId, spareQuantity);
    if (!result.updated) {
      return new Response(JSON.stringify({ error: result.reason || "Failed to update spare quantity" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error updating spare brick:", error);
    return new Response(JSON.stringify({ error: "Failed to update spare brick" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function DELETE({ params }: { params: { brickId: string } }) {
  try {
    const brickId = params.brickId;
    if (!brickId) {
      return new Response(JSON.stringify({ error: "Brick ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const result = await removeSpareBrick(brickId);
    if (!result.removed) {
      return new Response(JSON.stringify({ error: "Failed to remove spare brick" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error removing spare brick:", error);
    return new Response(JSON.stringify({ error: "Failed to remove spare brick" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
