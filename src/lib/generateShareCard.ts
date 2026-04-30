/**
 * Generate a shareable prize card image using HTML Canvas.
 * Renders a 1080x1080 (Instagram square) PNG with prize image, tier badge,
 * BushidoGacha branding, and a caption — perfect for WA/IG sharing.
 */

interface CardOptions {
  prize: string;
  tier: string;
  imageUrl?: string;
  /** Optional caption shown at bottom (e.g. translated CTA). */
  caption?: string;
  /** Optional site/url shown small at the very bottom. */
  siteLabel?: string;
}

const TIER_COLORS: Record<string, { from: string; to: string; label: string; emoji: string }> = {
  S: { from: "#FFD86B", to: "#FF7A18", label: "GRAND PRIZE", emoji: "💎" },
  A: { from: "#F7C948", to: "#B07A1B", label: "TIER A", emoji: "🥇" },
  B: { from: "#D8DEE9", to: "#7B8794", label: "TIER B", emoji: "🥈" },
  C: { from: "#D9A66C", to: "#7A4B1E", label: "TIER C", emoji: "🥉" },
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 2,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  // Ellipsize last line if too long
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    const remaining = words.slice(words.indexOf(last.split(" ").pop() || "") + 1);
    if (remaining.length > 0) {
      while (ctx.measureText(last + "…").width > maxWidth && last.length > 3) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = last + "…";
    }
  }
  return lines;
}

export async function generatePrizeShareCard(opts: CardOptions): Promise<Blob> {
  const SIZE = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const tierConf = TIER_COLORS[opts.tier] || TIER_COLORS.C;

  // ===== Background: dark gradient =====
  const bgGrad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  bgGrad.addColorStop(0, "#0B0420");
  bgGrad.addColorStop(0.5, "#1A0B3D");
  bgGrad.addColorStop(1, "#2B0A4A");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Radial glow accent on top
  const glow = ctx.createRadialGradient(SIZE / 2, 200, 0, SIZE / 2, 200, 700);
  glow.addColorStop(0, tierConf.from + "55");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // ===== Header: BushidoGacha brand =====
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 38px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("BUSHIDO", SIZE / 2 - 70, 90);
  ctx.fillStyle = tierConf.from;
  ctx.fillText("GACHA", SIZE / 2 + 90, 90);

  ctx.fillStyle = "#ffffffaa";
  ctx.font = "500 22px system-ui, -apple-system, sans-serif";
  ctx.fillText("I JUST WON A PRIZE!", SIZE / 2, 140);

  // ===== Tier badge ribbon =====
  const ribbonGrad = ctx.createLinearGradient(0, 0, SIZE, 0);
  ribbonGrad.addColorStop(0, tierConf.from);
  ribbonGrad.addColorStop(1, tierConf.to);
  ctx.fillStyle = ribbonGrad;
  const ribbonW = 380;
  const ribbonH = 70;
  const ribbonX = (SIZE - ribbonW) / 2;
  const ribbonY = 180;
  roundRect(ctx, ribbonX, ribbonY, ribbonW, ribbonH, 35);
  ctx.fill();

  ctx.fillStyle = "#0B0420";
  ctx.font = "900 34px system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(`${tierConf.emoji}  ${tierConf.label}`, SIZE / 2, ribbonY + ribbonH / 2 + 2);
  ctx.textBaseline = "alphabetic";

  // ===== Prize image card =====
  const cardSize = 600;
  const cardX = (SIZE - cardSize) / 2;
  const cardY = 290;

  // Outer glow border
  ctx.shadowColor = tierConf.from + "AA";
  ctx.shadowBlur = 60;
  ctx.fillStyle = ribbonGrad;
  roundRect(ctx, cardX - 8, cardY - 8, cardSize + 16, cardSize + 16, 40);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Inner white background for product image
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, cardX, cardY, cardSize, cardSize, 32);
  ctx.fill();

  // Try to draw the prize image
  if (opts.imageUrl) {
    try {
      const img = await loadImage(opts.imageUrl);
      // Clip to rounded rect
      ctx.save();
      roundRect(ctx, cardX, cardY, cardSize, cardSize, 32);
      ctx.clip();
      // Contain fit
      const ratio = Math.min(cardSize / img.width, cardSize / img.height) * 0.9;
      const drawW = img.width * ratio;
      const drawH = img.height * ratio;
      const dx = cardX + (cardSize - drawW) / 2;
      const dy = cardY + (cardSize - drawH) / 2;
      ctx.drawImage(img, dx, dy, drawW, drawH);
      ctx.restore();
    } catch {
      // Fallback: emoji
      ctx.fillStyle = "#1A0B3D";
      ctx.font = "240px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tierConf.emoji, cardX + cardSize / 2, cardY + cardSize / 2);
      ctx.textBaseline = "alphabetic";
    }
  } else {
    ctx.fillStyle = "#1A0B3D";
    ctx.font = "240px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tierConf.emoji, cardX + cardSize / 2, cardY + cardSize / 2);
    ctx.textBaseline = "alphabetic";
  }

  // ===== Prize name =====
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 56px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  const nameLines = wrapText(ctx, opts.prize, SIZE - 120, 2);
  let nameY = 960;
  if (nameLines.length === 1) nameY = 975;
  nameLines.forEach((line, i) => {
    ctx.fillText(line, SIZE / 2, nameY + i * 64);
  });

  // ===== Bottom caption / site =====
  ctx.fillStyle = "#ffffffaa";
  ctx.font = "500 24px system-ui, -apple-system, sans-serif";
  ctx.fillText(opts.siteLabel || "bushidogacha.com", SIZE / 2, SIZE - 30);

  // ===== Decorative sparkles =====
  ctx.fillStyle = tierConf.from;
  const sparkles = [
    [80, 220], [SIZE - 80, 220], [60, 880], [SIZE - 60, 880],
    [140, 500], [SIZE - 140, 500],
  ];
  sparkles.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to generate image"));
    }, "image/png", 0.92);
  });
}
