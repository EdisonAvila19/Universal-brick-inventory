import { useState } from "preact/hooks";
import type { CatalogVariant, ArchiveColor, Category } from "@/types/archiveData";
import { updateFeedback } from "@stores/feedback";
import { updateBrickCatalogEntry } from "@utils/bricksData";

interface Props {
  initialReference: string;
  initialName: string;
  initialImage: string;
  initialVariants: CatalogVariant[];
  colors: ArchiveColor[];
  allCategories: Category[];
  selectedCategoryIds: number[];
}

export default function BrickReferenceEditor({ initialReference, initialName, initialImage, initialVariants, colors, allCategories, selectedCategoryIds }: Readonly<Props>) {
  const [reference, setReference] = useState(initialReference);
  const [name, setName] = useState(initialName);
  const [variants, setVariants] = useState(
    initialVariants.map((v) => ({ ...v, originalBrickId: v.brickId }))
  );
  const [categoryIds, setCategoryIds] = useState<number[]>(selectedCategoryIds);
  const [saving, setSaving] = useState(false);
  const [originalReference, setOriginalReference] = useState(initialReference);

  const headerImage = variants.length > 0 ? variants[0].image : initialImage;

  function updateVariant(index: number, field: string, value: string | number) {
    setVariants((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function getColorHex(colorId: number): string {
    return colors.find((c) => c.id === colorId)?.rgb ?? "#ccc";
  }

  function hasDuplicateColor(colorId: number, excludeIndex: number): boolean {
    return variants.some((v, i) => i !== excludeIndex && v.colorId === colorId);
  }

  function toggleCategory(categoryId: number) {
    setCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  }

  async function handleSave() {
    if (!reference.trim()) {
      updateFeedback("Reference cannot be empty", "error");
      return;
    }
    if (!name.trim()) {
      updateFeedback("Name cannot be empty", "error");
      return;
    }

    for (let i = 0; i < variants.length; i++) {
      if (hasDuplicateColor(variants[i].colorId, i)) {
        const dup = colors.find((c) => c.id === variants[i].colorId);
        updateFeedback(`Duplicate color: ${dup?.name ?? variants[i].colorId} appears more than once`, "error");
        return;
      }
    }

    setSaving(true);

    const payload = {
      reference: reference.trim(),
      name: name.trim(),
      categoryIds,
      variants: variants.map((v) => ({
        originalBrickId: v.originalBrickId,
        elementId: v.elementId,
        colorId: v.colorId,
        image: v.image
      }))
    };

    const result = await updateBrickCatalogEntry(originalReference, payload);

    if (result.status === "ok") {
      updateFeedback("Catalog entry updated successfully", "info");

      if (result.newReference && result.newReference !== originalReference) {
        setOriginalReference(result.newReference);
        window.history.replaceState(null, "", `/bricks/${encodeURIComponent(result.newReference)}`);
      }
    } else {
      updateFeedback(result.message ?? "Failed to update catalog entry", "error");
    }

    setSaving(false);
  }

  return (
    <div class="flex flex-col gap-8">
      <section>
        <h1 class="text-4xl font-black tracking-tight mb-2">Brick Reference Editor</h1>
        <p class="text-secondary font-medium uppercase text-xs tracking-[0.2em]">Edit brick metadata by reference</p>
      </section>

      <section class="flex flex-col md:flex-row gap-6 items-start bg-surface-container-low rounded-xl p-6 shadow-[0_0_13px_-6px] shadow-contrast">
        <div class="w-32 h-32 rounded-xl overflow-hidden bg-surface-container-high shrink-0 shadow-sm">
          <img
            src={headerImage}
            alt={name}
            class="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=900&q=80";
            }}
          />
        </div>
        <div class="flex-1 w-full space-y-4">
          <div>
            <label class="text-xs font-bold uppercase tracking-wider text-secondary">Reference</label>
            <input
              type="text"
              value={reference}
              onInput={(e) => setReference((e.target as HTMLInputElement).value)}
              class="w-full bg-surface-container-high rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-mono"
            />
          </div>
          <div>
            <label class="text-xs font-bold uppercase tracking-wider text-secondary">Name</label>
            <input
              type="text"
              value={name}
              onInput={(e) => setName((e.target as HTMLInputElement).value)}
              class="w-full bg-surface-container-high rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <p class="text-xs text-secondary italic">Editing reference or name affects all color variants</p>
        </div>
      </section>

      {allCategories.length > 0 && (
        <section>
          <h2 class="text-lg font-bold mb-4">Categories</h2>
          <div class="bg-surface-container-low rounded-xl p-4 shadow-[0_0_13px_-6px] shadow-contrast">
            <div class="flex flex-wrap gap-3">
              {allCategories.map((cat) => {
                const selected = categoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all border-2 ${
                      selected
                        ? "bg-primary-container text-primary-container-contrast border-primary-container"
                        : "bg-surface-container-high text-secondary border-outline-variant/30 hover:border-primary/50"
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 class="text-lg font-bold mb-4">
          Color Variants
          <span class="text-secondary font-normal text-sm ml-2">({variants.length})</span>
        </h2>
        <div class="bg-surface-container-low rounded-xl overflow-hidden shadow-[0_0_13px_-6px] shadow-contrast">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-secondary text-xs uppercase tracking-wider border-b border-outline-variant/20">
                  <th class="text-left px-4 py-3 font-bold">Color</th>
                  <th class="text-left px-4 py-3 font-bold">Element ID</th>
                  <th class="text-left px-4 py-3 font-bold">Image</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant, index) => (
                  <tr
                    key={variant.originalBrickId}
                    class="border-b border-outline-variant/10 hover:bg-surface-container-high transition-colors"
                  >
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        <div
                          class="w-6 h-6 rounded-full border border-outline-variant/30 shrink-0 shadow-sm"
                          style={{ backgroundColor: getColorHex(variant.colorId) }}
                        ></div>
                        <select
                          value={variant.colorId}
                          onChange={(e) =>
                            updateVariant(index, "colorId", Number((e.target as HTMLSelectElement).value))
                          }
                          class="bg-surface-container-high rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary cursor-pointer min-w-[160px]"
                        >
                          {colors.map((color) => (
                            <option key={color.id} value={color.id}>
                              {color.id} — {color.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <input
                        type="text"
                        value={variant.elementId}
                        onInput={(e) => updateVariant(index, "elementId", (e.target as HTMLInputElement).value)}
                        placeholder="-"
                        class="w-full bg-surface-container-high rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary font-mono"
                      />
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2">
                        <input
                          type="text"
                          value={variant.image}
                          onInput={(e) => updateVariant(index, "image", (e.target as HTMLInputElement).value)}
                          class="flex-1 bg-surface-container-high rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary font-mono text-xs truncate"
                        />
                        <div class="w-8 h-8 rounded-lg border border-outline-variant/20 shrink-0 overflow-hidden bg-surface-container-high">
                          <img
                            src={variant.image}
                            alt=""
                            class="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=900&q=80";
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {variants.length === 0 && (
                  <tr>
                    <td colspan="3" class="text-center text-secondary py-12">
                      No color variants found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div class="flex justify-end gap-3">
        <a
          href="/bricks"
          class="bg-surface-container-high text-secondary font-bold px-6 py-3 rounded-lg hover:bg-surface-container transition-colors text-sm"
        >
          Back to Bricks
        </a>
        <button
          onClick={handleSave}
          disabled={saving}
          class="bg-primary-container text-primary-container-contrast font-bold px-8 py-3 rounded-lg hover:bg-[#f5d140] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
