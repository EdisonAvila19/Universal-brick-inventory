import type { APIRoute } from "astro";
import {
  getDesignGroups,
  createDesignGroup,
  deleteDesignGroup,
  assignReferenceToDesignGroup,
  unassignReferenceFromDesignGroup,
  searchReferencesForDesignGroup
} from "@lib/inventoryStore";

export const GET: APIRoute = async () => {
  try {
    const groups = await getDesignGroups();
    return new Response(JSON.stringify({ groups }), { status: 200 });
  } catch (error) {
    console.error("Error fetching design groups:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch design groups" }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "create") {
      const { name } = body;
      const result = await createDesignGroup(name);
      if (!result.created) {
        return new Response(JSON.stringify({ error: result.reason }), { status: 400 });
      }
      return new Response(JSON.stringify({ group: result.group }), { status: 200 });
    }

    if (action === "delete") {
      const { groupId } = body;
      if (!groupId) {
        return new Response(JSON.stringify({ error: "Group ID is required" }), { status: 400 });
      }
      const result = await deleteDesignGroup(Number(groupId));
      if (!result.deleted) {
        return new Response(JSON.stringify({ error: result.reason }), { status: 400 });
      }
      return new Response(JSON.stringify({ deleted: true }), { status: 200 });
    }

    if (action === "assign") {
      const { reference, groupId } = body;
      if (!reference || !groupId) {
        return new Response(JSON.stringify({ error: "reference and groupId are required" }), { status: 400 });
      }
      const result = await assignReferenceToDesignGroup(reference, Number(groupId));
      if (!result.assigned) {
        return new Response(JSON.stringify({ error: result.reason }), { status: 400 });
      }
      return new Response(JSON.stringify({ assigned: true }), { status: 200 });
    }

    if (action === "unassign") {
      const { reference } = body;
      if (!reference) {
        return new Response(JSON.stringify({ error: "reference is required" }), { status: 400 });
      }
      const result = await unassignReferenceFromDesignGroup(reference);
      if (!result.unassigned) {
        return new Response(JSON.stringify({ error: result.reason }), { status: 400 });
      }
      return new Response(JSON.stringify({ unassigned: true }), { status: 200 });
    }

    if (action === "search") {
      const { query } = body;
      if (!query || query.trim().length < 2) {
        return new Response(JSON.stringify({ references: [] }), { status: 200 });
      }
      const references = await searchReferencesForDesignGroup(query);
      return new Response(JSON.stringify({ references }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
  } catch (error) {
    console.error("Error processing design group action:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
};
