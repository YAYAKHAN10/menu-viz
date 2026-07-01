/**
 * Bakes per-combo AR models. OS AR viewers (Scene Viewer / Quick Look) take a
 * single file, so add-on/variant customisation can't happen inside them — the
 * combination has to be composed into one GLB ahead of time. This script does
 * that: for every dish, it enumerates the variant-only combos (one option per
 * group, see lib/combo.ts), composes the base dish + each chosen component onto
 * a shared ground plane at true real-world meters, Draco+JPEG optimises the
 * result (Scene-Viewer-safe — see CLAUDE.md §8), and writes it to
 * public/models/combos/<key>.glb. It then regenerates src/lib/combos.generated.ts
 * so the runtime AR seam knows which combos exist.
 *
 *   bun run bake:combos          # bake everything bakeable, rewrite the manifest
 *   bun run bake:combos --dry    # report what would bake, write nothing
 *
 * Inputs on disk (the source of truth):
 *   public/models/dishes/<dishId>.glb         base dishes (already real-meters)
 *   public/models/components/<optionId>.glb   one GLB per side/add-on option
 *
 * A combo bakes ONLY when the base dish AND every chosen component has a local
 * GLB. Components don't exist yet, so today this bakes nothing and writes an
 * empty manifest — the pipeline is ready the moment component GLBs land.
 *
 * Note: the optimise step shells out to `@gltf-transform/cli`, which pulls in
 * sharp; in the nix sandbox export LD_LIBRARY_PATH first (CLAUDE.md §8).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Document, NodeIO } from "@gltf-transform/core";
import type { Node, Scene } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { mergeDocuments, unpartition } from "@gltf-transform/functions";
import draco3d from "draco3d";
import { restaurants } from "@/data/restaurant";
import { comboKey } from "@/lib/combo";
import type { Dish, VariantGroup, VariantOption } from "@/types/restaurant";

const DISHES_DIR = "public/models/dishes";
const COMPONENTS_DIR = "public/models/components";
const COMBOS_DIR = "public/models/combos";
const MANIFEST_PATH = "src/lib/combos.generated.ts";

// Real-world target size (largest dimension, in METERS) for a placed component,
// by kind. The base dish keeps its authored size; components are scaled to sit
// believably beside it. Tune as real GLBs arrive.
const COMPONENT_TARGET_METERS: Record<VariantOption["kind"] & string, number> =
  {
    side: 0.09,
    drink: 0.12,
    extra: 0.05,
    wrap: 0.1,
  };

// Gap between the dish footprint and the first component, and between
// components laid out in a row to the +X side of the dish (meters).
const SLOT_GAP = 0.03;

type ComboPlan = {
  key: string;
  dish: Dish;
  /** The chosen option per variant group, all of which have a local GLB. */
  components: VariantOption[];
};

// Base dishes ship Draco-compressed, so the IO needs the codec to read/merge
// their geometry (and to re-encode on write before the CLI optimise pass).
let io: NodeIO;

async function createIO(): Promise<NodeIO> {
  return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    "draco3d.decoder": await draco3d.createDecoderModule(),
    "draco3d.encoder": await draco3d.createEncoderModule(),
  });
}

async function main() {
  io = await createIO();
  const dryRun = process.argv.includes("--dry");

  const plans = enumerateBakeablePlans();
  const skipped = enumerateAllPlans().length - plans.length;

  if (skipped > 0) {
    console.log(
      `· ${skipped} combo(s) skipped — base dish or a component GLB is missing.`,
    );
  }

  if (plans.length === 0) {
    console.log(
      "Nothing to bake (no combos have all component GLBs present yet).",
    );
    if (!dryRun) {
      writeManifest([]);
    }
    return;
  }

  if (dryRun) {
    console.log(`Would bake ${plans.length} combo(s):`);
    plans.forEach((plan) => console.log(`  • ${plan.key}`));
    return;
  }

  mkdirSync(COMBOS_DIR, { recursive: true });
  const baked: string[] = [];

  for (const plan of plans) {
    process.stdout.write(`  baking ${plan.key} … `);
    try {
      await bakeCombo(plan);
      baked.push(plan.key);
      console.log("✓");
    } catch (error) {
      console.log("✗");
      console.error(`    ${error instanceof Error ? error.message : error}`);
    }
  }

  writeManifest(baked);
  console.log(
    `Done: ${baked.length}/${plans.length} baked → ${COMBOS_DIR}, manifest updated.`,
  );
}

/** Cartesian product of one option per variant group, for every dish. */
function enumerateAllPlans(): ComboPlan[] {
  const plans: ComboPlan[] = [];

  for (const restaurant of restaurants) {
    for (const dish of restaurant.dishes) {
      const groups = dish.variants ?? [];

      if (groups.length === 0) {
        continue;
      }

      for (const combo of cartesian(groups)) {
        const selection: Record<string, string> = {};
        combo.forEach(({ group, option }) => {
          selection[group.id] = option.id;
        });

        plans.push({
          key: comboKey(dish.id, selection, groups),
          dish,
          components: combo.map(({ option }) => option),
        });
      }
    }
  }

  return plans;
}

/** Only the plans whose base dish + every component has a local GLB. */
function enumerateBakeablePlans(): ComboPlan[] {
  return enumerateAllPlans().filter((plan) => {
    if (!existsSync(dishPath(plan.dish.id))) {
      return false;
    }
    return plan.components.every((option) =>
      existsSync(componentPath(option.id)),
    );
  });
}

/** Every combination picking exactly one option from each group. */
function cartesian(
  groups: VariantGroup[],
): { group: VariantGroup; option: VariantOption }[][] {
  return groups.reduce<{ group: VariantGroup; option: VariantOption }[][]>(
    (acc, group) =>
      acc.flatMap((prefix) =>
        group.options.map((option) => [...prefix, { group, option }]),
      ),
    [[]],
  );
}

async function bakeCombo(plan: ComboPlan) {
  const doc = new Document();
  const scene = doc.createScene("combo").setExtras({});
  doc.getRoot().setDefaultScene(scene);

  // Base dish: keep authored real-world size, just centre on X/Z and ground it.
  await appendPart(doc, scene, dishPath(plan.dish.id), {
    targetMeters: null,
    slotX: 0,
    slotZ: 0,
  });

  // Lay the components out in a row to the +X side of the dish footprint.
  const dishHalfWidth = await horizontalHalfWidth(dishPath(plan.dish.id));
  let cursorX = dishHalfWidth + SLOT_GAP;

  for (const option of plan.components) {
    const target = COMPONENT_TARGET_METERS[option.kind ?? "side"] ?? 0.09;
    const slotX = cursorX + target / 2;
    await appendPart(doc, scene, componentPath(option.id), {
      targetMeters: target,
      slotX,
      slotZ: 0,
    });
    cursorX = slotX + target / 2 + SLOT_GAP;
  }

  // Each merged part brought its own buffer; GLB allows at most one.
  await doc.transform(unpartition());

  const rawPath = join(COMBOS_DIR, `${plan.key}.raw.glb`);
  await io.write(rawPath, doc);

  optimize(rawPath, join(COMBOS_DIR, `${plan.key}.glb`));
  rmSync(rawPath, { force: true });
}

/**
 * Reads a GLB, merges it into `doc`, then reparents its top-level nodes under a
 * single wrapper node that scales the part to `targetMeters` (or leaves it at
 * authored scale when null), centres it on X/Z, rests it on the ground (y=0),
 * and shifts it to its slot. Mirrors the runtime preview's NormalizedModel.
 */
async function appendPart(
  doc: Document,
  scene: Scene,
  path: string,
  layout: { targetMeters: number | null; slotX: number; slotZ: number },
) {
  const part = await readClone(path);
  const before = new Set(doc.getRoot().listScenes());
  mergeDocuments(doc, part);
  const added = doc
    .getRoot()
    .listScenes()
    .filter((s) => !before.has(s));

  const { min, max } = boundsOfScenes(added);
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const maxDim = Math.max(size[0], size[1], size[2]) || 1;
  const scale = layout.targetMeters ? layout.targetMeters / maxDim : 1;
  const centerX = (min[0] + max[0]) / 2;
  const centerZ = (min[2] + max[2]) / 2;

  const wrapper = doc
    .createNode(`part:${path}`)
    .setScale([scale, scale, scale])
    .setTranslation([
      layout.slotX - centerX * scale,
      -min[1] * scale,
      layout.slotZ - centerZ * scale,
    ]);

  for (const added_scene of added) {
    for (const node of added_scene.listChildren()) {
      added_scene.removeChild(node);
      wrapper.addChild(node);
    }
    added_scene.dispose();
  }

  scene.addChild(wrapper);
}

async function horizontalHalfWidth(path: string): Promise<number> {
  const doc = await readClone(path);
  const { min, max } = boundsOfScenes(doc.getRoot().listScenes());
  return Math.max(max[0] - min[0], max[2] - min[2]) / 2;
}

async function readClone(path: string): Promise<Document> {
  // Each part is read fresh so merges never share graph nodes.
  return io.read(path);
}

/** Axis-aligned world bounds across the given scenes' geometry. */
function boundsOfScenes(scenes: Scene[]) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const v = [0, 0, 0];

  for (const scene of scenes) {
    scene.traverse((node: Node) => {
      const mesh = node.getMesh();
      if (!mesh) {
        return;
      }
      const m = node.getWorldMatrix();
      for (const prim of mesh.listPrimitives()) {
        const position = prim.getAttribute("POSITION");
        if (!position) {
          continue;
        }
        for (let i = 0; i < position.getCount(); i++) {
          position.getElement(i, v);
          const x = m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12];
          const y = m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13];
          const z = m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14];
          min[0] = Math.min(min[0], x);
          min[1] = Math.min(min[1], y);
          min[2] = Math.min(min[2], z);
          max[0] = Math.max(max[0], x);
          max[1] = Math.max(max[1], y);
          max[2] = Math.max(max[2], z);
        }
      }
    });
  }

  return { min, max };
}

function optimize(input: string, output: string) {
  const result = spawnSync(
    "bunx",
    [
      "@gltf-transform/cli",
      "optimize",
      input,
      output,
      "--compress",
      "draco",
      "--simplify-ratio",
      "0.12",
      "--simplify-error",
      "0.001",
      "--texture-compress",
      "auto",
      "--texture-size",
      "1024",
    ],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    throw new Error(
      `gltf-transform optimize failed:\n${(result.stderr || result.stdout || "").trim()}`,
    );
  }
}

function writeManifest(keys: string[]) {
  const sorted = [...keys].sort();
  const entries = sorted.map((key) => `  ${JSON.stringify(key)},`).join("\n");
  const body = sorted.length ? `\n${entries}\n` : "";

  const file = `// AUTO-GENERATED by \`bun run bake:combos\`. Do not edit by hand.
//
// The set of combo keys (see lib/combo.ts) that have a baked GLB uploaded to
// R2 under models/combos/<key>.glb. The AR seam (lib/ar.ts) only points Scene
// Viewer at a combo when its key is in this set; otherwise it falls back to the
// base dish model. Empty until component (side/add-on) GLBs exist to bake.

export const BAKED_COMBOS: ReadonlySet<string> = new Set<string>([${body}]);
`;

  writeFileSync(MANIFEST_PATH, file);
}

function dishPath(dishId: string): string {
  return join(DISHES_DIR, `${dishId}.glb`);
}

function componentPath(optionId: string): string {
  return join(COMPONENTS_DIR, `${optionId}.glb`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
