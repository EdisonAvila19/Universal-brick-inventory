import type { APIRoute } from "astro";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from "@lib/inventoryStore";

export const GET: APIRoute = async () => {
  try {
    const categories = await getCategories();
    return new Response(JSON.stringify({ categories }), { status: 200 });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch categories" }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "create") {
      const { name } = body;
      if (!name || typeof name !== "string") {
        return new Response(JSON.stringify({ error: "Name is required" }), { status: 400 });
      }
      const result = await createCategory(name);
      if (!result.created) {
        return new Response(JSON.stringify({ error: result.reason }), { status: 400 });
      }
      return new Response(JSON.stringify({ category: { id: result.id, name: name.trim() } }), { status: 200 });
    }

    if (action === "update") {
      const { id, name } = body;
      if (!id || !name || typeof name !== "string") {
        return new Response(JSON.stringify({ error: "id and name are required" }), { status: 400 });
      }
      const result = await updateCategory(Number(id), name);
      if (!result.updated) {
        return new Response(JSON.stringify({ error: result.reason }), { status: 400 });
      }
      return new Response(JSON.stringify({ updated: true }), { status: 200 });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "id is required" }), { status: 400 });
      }
      const result = await deleteCategory(Number(id));
      if (!result.deleted) {
        return new Response(JSON.stringify({ error: result.reason }), { status: 400 });
      }
      return new Response(JSON.stringify({ deleted: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
  } catch (error) {
    console.error("Error processing category action:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
};
