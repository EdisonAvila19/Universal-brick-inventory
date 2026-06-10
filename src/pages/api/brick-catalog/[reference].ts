import { getBrickCatalogEntry, updateBrickCatalogEntry } from "@lib/inventoryStore";

export async function GET({ params }: { params: { reference: string } }) {
  try {
    const reference = params.reference;
    if (!reference) {
      return new Response(JSON.stringify({ error: "Reference is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const entry = await getBrickCatalogEntry(reference);
    if (!entry) {
      return new Response(JSON.stringify({ error: "Reference not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify(entry), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error fetching brick catalog entry:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch brick catalog entry" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function PUT({ params, request }: { params: { reference: string }; request: Request }) {
  try {
    const reference = params.reference;
    if (!reference) {
      return new Response(JSON.stringify({ error: "Reference is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await request.json();
    const result = await updateBrickCatalogEntry({
      originalReference: reference,
      reference: body.reference,
      name: body.name,
      categoryIds: body.categoryIds,
      variants: body.variants
    });

    if (!result.updated) {
      return new Response(JSON.stringify({ error: result.reason }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true, newReference: result.newReference }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error updating brick catalog entry:", error);
    return new Response(JSON.stringify({ error: "Failed to update brick catalog entry" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
