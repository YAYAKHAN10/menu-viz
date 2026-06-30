/**
 * One-off prep for the Meshy crispy-chicken export, which ships POSITION-only
 * (no normals, no material, no texture). Without this it renders as a flat,
 * unshaded blob. We weld, compute smooth normals, and assign a warm "crispy"
 * PBR material so it reads as fried chicken even untextured. Heavy compression
 * (simplify/meshopt/texture) is left to `gltf-transform optimize` afterwards.
 *
 *   bun run scripts/prep-chicken.ts <input.glb> <output.glb>
 */
import { NodeIO } from "@gltf-transform/core";
import { weld } from "@gltf-transform/functions";

// Smooth per-vertex normals from welded geometry — functions.normals is not
// exported in all builds, so compute area-weighted normals directly.
import type { Document, Primitive } from "@gltf-transform/core";

async function main() {
  const [input, output] = process.argv.slice(2);

  if (!input || !output) {
    console.error("usage: bun run scripts/prep-chicken.ts <input> <output>");
    process.exit(1);
  }

  const io = new NodeIO();
  const doc = await io.read(input);

  await doc.transform(weld());

  computeNormals(doc);
  assignCrispyMaterial(doc);

  await io.write(output, doc);
  console.log(`✓ prepped chicken → ${output}`);
}

function computeNormals(doc: Document) {
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      if (prim.getAttribute("NORMAL")) {
        continue;
      }

      addNormals(doc, prim);
    }
  }
}

function addNormals(doc: Document, prim: Primitive) {
  const position = prim.getAttribute("POSITION");
  const indices = prim.getIndices();

  if (!position) {
    return;
  }

  const count = position.getCount();
  const normals = new Float32Array(count * 3);
  const a = [0, 0, 0];
  const b = [0, 0, 0];
  const c = [0, 0, 0];

  const triCount = indices ? indices.getCount() / 3 : count / 3;

  for (let t = 0; t < triCount; t++) {
    const i0 = indices ? indices.getScalar(t * 3) : t * 3;
    const i1 = indices ? indices.getScalar(t * 3 + 1) : t * 3 + 1;
    const i2 = indices ? indices.getScalar(t * 3 + 2) : t * 3 + 2;

    position.getElement(i0, a);
    position.getElement(i1, b);
    position.getElement(i2, c);

    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    // Cross product, left un-normalized so larger faces weight more.
    const nx = e1[1] * e2[2] - e1[2] * e2[1];
    const ny = e1[2] * e2[0] - e1[0] * e2[2];
    const nz = e1[0] * e2[1] - e1[1] * e2[0];

    for (const idx of [i0, i1, i2]) {
      normals[idx * 3] += nx;
      normals[idx * 3 + 1] += ny;
      normals[idx * 3 + 2] += nz;
    }
  }

  for (let i = 0; i < count; i++) {
    const x = normals[i * 3];
    const y = normals[i * 3 + 1];
    const z = normals[i * 3 + 2];
    const len = Math.hypot(x, y, z) || 1;
    normals[i * 3] = x / len;
    normals[i * 3 + 1] = y / len;
    normals[i * 3 + 2] = z / len;
  }

  const accessor = doc
    .createAccessor()
    .setType("VEC3")
    .setArray(normals)
    .setBuffer(doc.getRoot().listBuffers()[0]);

  prim.setAttribute("NORMAL", accessor);
}

function assignCrispyMaterial(doc: Document) {
  // Golden, slightly rough fried-chicken surface. No metalness.
  const material = doc
    .createMaterial("crispy-chicken")
    .setBaseColorFactor([0.78, 0.52, 0.24, 1])
    .setRoughnessFactor(0.62)
    .setMetallicFactor(0);

  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      if (!prim.getMaterial()) {
        prim.setMaterial(material);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
