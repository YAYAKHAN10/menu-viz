/**
 * Normalizes a model so its largest horizontal (X/Z) dimension equals a target
 * size in METERS. menuviz places dishes in AR with ar-scale="fixed", so the GLB
 * must be authored in real-world meters or the dish lands the wrong size on the
 * table. Meshy/Tripo exports come in arbitrary ~1-unit space; this rescales them.
 *
 * Run BEFORE `gltf-transform optimize` (positions must be plain f32, not yet
 * meshopt-quantized).
 *
 *   bun run scripts/normalize-scale.ts <input.glb> <output.glb> <targetMeters>
 */
import { NodeIO } from "@gltf-transform/core";
import type { Document } from "@gltf-transform/core";

async function main() {
  const [input, output, targetArg] = process.argv.slice(2);
  const target = Number(targetArg);

  if (!input || !output || !Number.isFinite(target) || target <= 0) {
    console.error(
      "usage: bun run scripts/normalize-scale.ts <input> <output> <targetMeters>",
    );
    process.exit(1);
  }

  const io = new NodeIO();
  const doc = await io.read(input);

  const { size } = worldBounds(doc);
  const horizontal = Math.max(size[0], size[2]);

  if (horizontal <= 0) {
    console.error("✗ degenerate bounds; cannot scale");
    process.exit(1);
  }

  const factor = target / horizontal;

  for (const scene of doc.getRoot().listScenes()) {
    for (const node of scene.listChildren()) {
      const s = node.getScale();
      node.setScale([s[0] * factor, s[1] * factor, s[2] * factor]);
      const t = node.getTranslation();
      node.setTranslation([t[0] * factor, t[1] * factor, t[2] * factor]);
    }
  }

  await io.write(output, doc);
  console.log(
    `✓ scaled ×${factor.toFixed(4)} (was ${horizontal.toFixed(3)} → ${target}m) → ${output}`,
  );
}

function worldBounds(doc: Document) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const v = [0, 0, 0];

  for (const scene of doc.getRoot().listScenes()) {
    scene.traverse((node) => {
      const mesh = node.getMesh();

      if (!mesh) {
        return;
      }

      const matrix = node.getWorldMatrix();

      for (const prim of mesh.listPrimitives()) {
        const position = prim.getAttribute("POSITION");

        if (!position) {
          continue;
        }

        for (let i = 0; i < position.getCount(); i++) {
          position.getElement(i, v);
          const x =
            matrix[0] * v[0] + matrix[4] * v[1] + matrix[8] * v[2] + matrix[12];
          const y =
            matrix[1] * v[0] + matrix[5] * v[1] + matrix[9] * v[2] + matrix[13];
          const z =
            matrix[2] * v[0] +
            matrix[6] * v[1] +
            matrix[10] * v[2] +
            matrix[14];
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

  return {
    min,
    max,
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
