// The single source of truth for AR combo identity, shared by the baker
// (scripts/bake-combos.ts) and the runtime AR seam (lib/ar.ts). Keep it pure —
// no React, no Node — so both sides compute byte-identical keys.

import type { VariantGroup } from "@/types/restaurant";

/**
 * Resolves the chosen option id for a group: the explicit selection, else the
 * group default, else the first option. A group always has exactly one choice.
 */
export function chosenVariantOptionId(
  group: VariantGroup,
  variantSelection: Record<string, string>,
): string | undefined {
  return (
    variantSelection[group.id] ?? group.defaultOptionId ?? group.options[0]?.id
  );
}

/**
 * Deterministic key for a baked AR combo: the dish id plus its chosen variant
 * option per group, sorted by group id so order of selection never changes the
 * key. Scope is "variants only" — additive add-ons are not baked and so do not
 * participate. A dish with no variants returns its bare id.
 *
 *   comboKey("beef-burger", { side: "mashed" }, groups) → "beef-burger__side-mashed"
 *   comboKey("beef-burger", {}, [])                      → "beef-burger"
 */
export function comboKey(
  dishId: string,
  variantSelection: Record<string, string>,
  groups: VariantGroup[],
): string {
  const parts = [...groups]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((group) => {
      const optionId = chosenVariantOptionId(group, variantSelection);
      return optionId ? `${group.id}-${optionId}` : null;
    })
    .filter((part): part is string => part !== null);

  return parts.length > 0 ? `${dishId}__${parts.join("__")}` : dishId;
}
