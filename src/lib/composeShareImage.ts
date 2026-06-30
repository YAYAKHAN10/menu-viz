// Client-only canvas compositor for the branded share photo — the growth engine
// (CLAUDE.md §8). Platform-independent: it composes a static shot (dish frame
// over the live camera background) so no AR/SLAM is required. Identical output on
// iOS and Android, which is the point — the shared photo is the ad.

export type ComposeShareInput = {
  /** PNG data URL of the dish render (transparent bg). */
  dishDataUrl: string;
  /** JPEG/PNG data URL of the camera frame, or null for a branded backdrop. */
  backgroundDataUrl?: string | null;
  restaurantName: string;
  dishName: string;
  price: number;
  /** The dish's living accent (hex) — the only color on the frame. */
  accent: string;
};

const WIDTH = 1080;
const HEIGHT = 1920; // 9:16 — stories on IG / TikTok / WhatsApp

export async function composeShareImage(
  input: ComposeShareInput,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("canvas-2d-unavailable");
  }

  // Background: the real table (camera frame) or a deep monochrome backdrop.
  if (input.backgroundDataUrl) {
    const bg = await loadImage(input.backgroundDataUrl);
    drawCover(ctx, bg, WIDTH, HEIGHT);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, "#15161a");
    gradient.addColorStop(1, "#000000");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Legibility scrim: gentle at top, deep at the bottom where the caption sits.
  const scrim = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  scrim.addColorStop(0, "rgba(0,0,0,0.42)");
  scrim.addColorStop(0.45, "rgba(0,0,0,0.10)");
  scrim.addColorStop(0.78, "rgba(0,0,0,0.28)");
  scrim.addColorStop(1, "rgba(0,0,0,0.86)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // The dish, contained and centered a touch above the optical middle.
  const dish = await loadImage(input.dishDataUrl);
  const maxW = WIDTH * 0.82;
  const maxH = HEIGHT * 0.5;
  const scale = Math.min(maxW / dish.width, maxH / dish.height);
  const dishW = dish.width * scale;
  const dishH = dish.height * scale;
  const dishX = (WIDTH - dishW) / 2;
  const dishY = HEIGHT * 0.4 - dishH / 2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 36;
  ctx.drawImage(dish, dishX, dishY, dishW, dishH);
  ctx.restore();

  await ensureFontsReady();

  // Wordmark, top-left, tracked uppercase — the quiet instrument voice.
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "600 30px Geist, system-ui, sans-serif";
  drawTracked(ctx, "MENUVIZ.APP", 64, 96, 6);

  // Caption block, bottom-left.
  const baseX = 64;
  let y = HEIGHT - 230;

  // Accent rule — the dish's own color, the only hue on the frame.
  ctx.fillStyle = input.accent;
  ctx.fillRect(baseX, y - 36, 56, 5);

  ctx.fillStyle = "#ffffff";
  ctx.font = "600 76px Geist, system-ui, sans-serif";
  const dishName = fitText(ctx, input.dishName, WIDTH - baseX * 2);
  ctx.fillText(dishName, baseX, y + 34);

  y += 78;
  ctx.fillStyle = "rgba(255,255,255,0.70)";
  ctx.font = "500 38px Geist, system-ui, sans-serif";
  ctx.fillText(`${input.restaurantName}  ·  Rs. ${input.price}`, baseX, y + 24);

  return canvasToBlob(canvas);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image-load-failed"));
    img.src = src;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(width / img.width, height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
}

function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
) {
  let cursor = x;
  for (const char of text) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + tracking;
  }
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  let truncated = text;
  while (
    truncated.length > 1 &&
    ctx.measureText(`${truncated}…`).width > maxWidth
  ) {
    truncated = truncated.slice(0, -1);
  }

  return `${truncated.trimEnd()}…`;
}

async function ensureFontsReady() {
  try {
    await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
  } catch {
    // Font loading is best-effort; system-ui fallback is acceptable.
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("canvas-encode-failed"));
        }
      },
      "image/jpeg",
      0.92,
    );
  });
}
