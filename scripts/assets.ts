/**
 * R2 asset manager for 3D models. Keeps the bucket in sync with the local
 * `public/models/dishes/` and `public/models/combos/` directories (the source
 * of truth; combos are produced by `bun run bake:combos`).
 *
 *   bun run assets:list           # show remote objects + drift vs local
 *   bun run assets:push           # upload all local GLB/USDZ (content-typed)
 *   bun run assets:prune          # delete remote objects with no local file
 *   bun run assets:sync           # push then prune (make remote match local)
 *   bun run assets:rm <id|key>... # delete by dish id (both .glb/.usdz) or key
 *
 * Auth: CLOUDFLARE_API_TOKEN (env) or the .cf-token file. Account/bucket come
 * from CLOUDFLARE_ACCOUNT_ID / R2_BUCKET env or the defaults below.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ACCOUNT_ID =
  process.env.CLOUDFLARE_ACCOUNT_ID ?? "09abb782bf38f116f993da799ee6e023";
const BUCKET = process.env.R2_BUCKET ?? "menuviz-assets";
const CACHE_CONTROL = "public, max-age=31536000, immutable";

// Local source dirs ↔ remote key prefixes. Both stay in sync with the bucket;
// combos are produced by `bun run bake:combos`.
type Source = { dir: string; prefix: string };
const SOURCES: Source[] = [
  { dir: "public/models/dishes", prefix: "models/dishes" },
  { dir: "public/models/combos", prefix: "models/combos" },
];

const CONTENT_TYPES: Record<string, string> = {
  ".glb": "model/gltf-binary",
  ".usdz": "model/vnd.usdz+zip",
};

type RemoteObject = { key: string; size: number };

function token(): string {
  const fromEnv = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  if (existsSync(".cf-token")) return readFileSync(".cf-token", "utf8").trim();
  fail("No API token. Set CLOUDFLARE_API_TOKEN or create a .cf-token file.");
}

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

type LocalAsset = { path: string; key: string };

function localAssets(): LocalAsset[] {
  const assets: LocalAsset[] = [];
  for (const { dir, prefix } of SOURCES) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).sort()) {
      if (extOf(name) in CONTENT_TYPES) {
        assets.push({ path: join(dir, name), key: `${prefix}/${name}` });
      }
    }
  }
  return assets;
}

const api = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}`;

async function listRemote(): Promise<RemoteObject[]> {
  const res = await fetch(`${api}/objects?per_page=1000`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  const body = (await res.json()) as {
    success: boolean;
    result?: RemoteObject[];
    errors?: { code: number; message: string }[];
  };
  if (!body.success) {
    fail(
      `list failed: ${(body.errors ?? []).map((e) => `${e.code} ${e.message}`).join("; ")}`,
    );
  }
  return (body.result ?? []).map((o) => ({ key: o.key, size: o.size ?? 0 }));
}

async function deleteRemote(key: string): Promise<void> {
  const path = key.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`${api}/objects/${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) fail(`delete failed for ${key}: HTTP ${res.status}`);
}

function uploadLocal(asset: LocalAsset): boolean {
  const { path, key } = asset;
  const result = spawnSync(
    "bunx",
    [
      "wrangler",
      "r2",
      "object",
      "put",
      `${BUCKET}/${key}`,
      "--file",
      path,
      "--remote",
      "--content-type",
      CONTENT_TYPES[extOf(path)],
      "--cache-control",
      CACHE_CONTROL,
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        CLOUDFLARE_API_TOKEN: token(),
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
      },
    },
  );
  if (result.status !== 0) {
    console.error(
      `  ✗ ${key}\n${(result.stderr || result.stdout || "").trim()}`,
    );
    return false;
  }
  console.log(`  ✓ ${key}`);
  return true;
}

async function cmdList(): Promise<void> {
  const remote = await listRemote();
  const remoteKeys = new Set(remote.map((o) => o.key));
  const localKeys = new Set(localAssets().map((a) => a.key));

  console.log(`Remote (${BUCKET}): ${remote.length} object(s)`);
  for (const o of remote.sort((a, b) => a.key.localeCompare(b.key))) {
    const stale = localKeys.has(o.key) ? "" : "  ⚠ stale (no local file)";
    console.log(`  ${o.key}  ${(o.size / 1024).toFixed(1)} KB${stale}`);
  }

  const missing = [...localKeys].filter((k) => !remoteKeys.has(k)).sort();
  if (missing.length) {
    console.log(`\nLocal-only (not yet pushed): ${missing.length}`);
    missing.forEach((k) => console.log(`  ${k}`));
  }
}

async function cmdPush(): Promise<void> {
  const assets = localAssets();
  if (!assets.length) {
    fail(`no GLB/USDZ files in ${SOURCES.map((s) => s.dir).join(" or ")}`);
  }
  console.log(`Uploading ${assets.length} asset(s) to ${BUCKET}...`);
  let ok = 0;
  for (const asset of assets) if (uploadLocal(asset)) ok += 1;
  console.log(`Done: ${ok}/${assets.length} uploaded.`);
  if (ok !== assets.length) process.exit(1);
}

async function cmdPrune(dryRun: boolean): Promise<void> {
  const localKeys = new Set(localAssets().map((a) => a.key));
  const stale = (await listRemote())
    .map((o) => o.key)
    .filter((k) => !localKeys.has(k));

  if (!stale.length) {
    console.log("Nothing to prune — remote matches local.");
    return;
  }
  console.log(
    `${dryRun ? "Would delete" : "Deleting"} ${stale.length} stale object(s):`,
  );
  for (const key of stale) {
    console.log(`  ${dryRun ? "•" : "✓"} ${key}`);
    if (!dryRun) await deleteRemote(key);
  }
}

async function cmdRm(args: string[]): Promise<void> {
  if (!args.length) fail("usage: assets rm <dishId|key>...");
  const remoteKeys = new Set((await listRemote()).map((o) => o.key));

  const targets = new Set<string>();
  for (const arg of args) {
    if (arg.includes("/")) {
      targets.add(arg);
    } else {
      // Bare id → every source prefix × known extension.
      for (const { prefix } of SOURCES) {
        for (const ext of Object.keys(CONTENT_TYPES)) {
          targets.add(`${prefix}/${arg}${ext}`);
        }
      }
    }
  }

  let deleted = 0;
  for (const key of targets) {
    if (!remoteKeys.has(key)) {
      console.log(`  – ${key} (not in bucket)`);
      continue;
    }
    await deleteRemote(key);
    console.log(`  ✓ deleted ${key}`);
    deleted += 1;
  }
  console.log(`Deleted ${deleted} object(s).`);
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  switch (command) {
    case "list":
      return cmdList();
    case "push":
      return cmdPush();
    case "prune":
      return cmdPrune(rest.includes("--dry-run"));
    case "sync":
      await cmdPush();
      return cmdPrune(false);
    case "rm":
      return cmdRm(rest);
    default:
      console.log(
        "usage: bun run scripts/assets.ts <list|push|prune|sync|rm> [args]",
      );
      process.exit(command ? 1 : 0);
  }
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
