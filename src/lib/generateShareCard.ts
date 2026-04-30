/**
 * Generate a shareable prize card image using HTML Canvas.
 * Renders a 1080x1080 (Instagram square) PNG with prize image, tier badge,
 * BushidoGacha branding, and a caption — perfect for WA/IG/FB sharing.
 *
 * Design goals: HADIAH menjadi fokus utama (bukan brand), agar saat di-share
 * ke sosial media, yang dilihat orang adalah hadiah yang dimenangkan.
 */

interface CardOptions {
  prize: string;
  tier: string;
  imageUrl?: string;
  /** Campaign name (e.g. "Ultimate Desk Setup") shown above the prize image. */
  campaign?: string;
  /** Optional caption shown at bottom (e.g. translated CTA). */
  caption?: string;
  /** Optional site/url shown small at the very bottom. */
  siteLabel?: string;
}

const TIER_COLORS: Record<
  string,
  { from: string; to: string; accent: string; label: string; emoji: string; bgFrom: string; bgTo: string }
> = {
  S: {
    from: "#FFE27A",
    to: "#FF7A18",
    accent: "#FFD86B",
    label: "GRAND PRIZE",
    emoji: "💎",
    bgFrom: "#2A0A0A",
    bgTo: "#4A1A00",
  },
  A: {
    from: "#FFD86B",
    to: "#B07A1B",
    accent: "#FFD86B",
    label: "TIER A • RARE",
    emoji: "🥇",
    bgFrom: "#1F1407",
    bgTo: "#3A2410",
  },
  B: {
    from: "#E5E9F0",
    to: "#7B8794",
    accent: "#D8DEE9",
    label: "TIER B",
    emoji: "🥈",
    bgFrom: "#0F1620",
    bgTo: "#1F2A3A",
  },
  C: {
    from: "#E2A878",
    to: "#7A4B1E",
    accent: "#D9A66C",
    label: "TIER C",
    emoji: "🥉",
    bgFrom: "#1A1208",
    bgTo: "#2D1E10",
  },
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
      if (lines.length === maxLines - 1) {
        // continue accumulating remaining words into final line
      }
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (ctx.measureText(last + "…").width > maxWidth && last.length > 3) {
      last = last.slice(0, -1);
    }
    kept[maxLines - 1] = last + "…";
    return kept;
  }
  return lines;
}

export async function generatePrizeShareCard(opts: CardOptions): Promise<Blob> {
  const SIZE = 1080;
  // Render at 2x for crisp output on retina/HD social feeds; ctx is scaled so
  // all drawing code keeps using logical 1080×1080 coordinates.
  const SCALE = 2;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE * SCALE;
  canvas.height = SIZE * SCALE;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas not supported");
  ctx.scale(SCALE, SCALE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // Crisp text rendering
  (ctx as any).textRendering = "geometricPrecision";

  const tierConf = TIER_COLORS[opts.tier] || TIER_COLORS.C;

  // ===== Background: tier-tinted dark gradient =====
  const bgGrad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  bgGrad.addColorStop(0, "#08030F");
  bgGrad.addColorStop(0.5, tierConf.bgFrom);
  bgGrad.addColorStop(1, "#08030F");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Diagonal light streaks for depth
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = tierConf.from;
  ctx.lineWidth = 2;
  for (let i = -SIZE; i < SIZE * 2; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + SIZE, SIZE);
    ctx.stroke();
  }
  ctx.restore();

  // Radial spotlight behind prize
  const spot = ctx.createRadialGradient(SIZE / 2, 540, 80, SIZE / 2, 540, 600);
  spot.addColorStop(0, tierConf.from + "60");
  spot.addColorStop(0.6, tierConf.from + "10");
  spot.addColorStop(1, "transparent");
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // ===== Top header: small "I JUST WON" tag =====
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 28px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🎉  I JUST WON  🎉", SIZE / 2, 80);

  // ===== Tier badge ribbon =====
  const ribbonGrad = ctx.createLinearGradient(0, 0, SIZE, 0);
  ribbonGrad.addColorStop(0, tierConf.from);
  ribbonGrad.addColorStop(1, tierConf.to);

  ctx.font = "900 32px system-ui, -apple-system, sans-serif";
  const ribbonLabel = `${tierConf.emoji}  ${tierConf.label}`;
  const ribbonTextW = ctx.measureText(ribbonLabel).width;
  const ribbonW = Math.max(380, ribbonTextW + 80);
  const ribbonH = 64;
  const ribbonX = (SIZE - ribbonW) / 2;
  const ribbonY = 110;

  ctx.shadowColor = tierConf.from + "AA";
  ctx.shadowBlur = 30;
  ctx.fillStyle = ribbonGrad;
  roundRect(ctx, ribbonX, ribbonY, ribbonW, ribbonH, 32);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#0B0420";
  ctx.textBaseline = "middle";
  ctx.fillText(ribbonLabel, SIZE / 2, ribbonY + ribbonH / 2 + 2);
  ctx.textBaseline = "alphabetic";

  // ===== Campaign chip — colored by winning tier for instant context =====
  const campaignName = (opts.campaign || "").trim();
  if (campaignName) {
    ctx.font = "800 22px system-ui, -apple-system, sans-serif";
    let label = `FROM  •  ${campaignName.toUpperCase()}`;
    const maxChipW = SIZE - 160;
    while (ctx.measureText(label).width > maxChipW - 48 && label.length > 12) {
      label = label.slice(0, -2);
    }
    if (label !== `FROM  •  ${campaignName.toUpperCase()}`) label = label + "…";

    const chipTextW = ctx.measureText(label).width;
    const chipW = Math.min(maxChipW, chipTextW + 48);
    const chipH = 40;
    const chipX = (SIZE - chipW) / 2;
    const chipY = ribbonY + ribbonH + 10;

    // Tier-specific gradient: S=rainbow, A=gold, B=silver, C=bronze
    let chipGrad: CanvasGradient;
    if (opts.tier === "S") {
      chipGrad = ctx.createLinearGradient(chipX, 0, chipX + chipW, 0);
      chipGrad.addColorStop(0, "#FF6B6B");      // red
      chipGrad.addColorStop(0.2, "#FFD93D");    // gold
      chipGrad.addColorStop(0.4, "#6BCB77");    // green
      chipGrad.addColorStop(0.6, "#4D96FF");    // blue
      chipGrad.addColorStop(0.8, "#B084FF");    // purple
      chipGrad.addColorStop(1, "#FF6BD6");      // pink
    } else {
      chipGrad = ctx.createLinearGradient(chipX, 0, chipX + chipW, 0);
      chipGrad.addColorStop(0, tierConf.from);
      chipGrad.addColorStop(1, tierConf.to);
    }

    // Soft glow matching tier
    ctx.save();
    ctx.shadowColor = (opts.tier === "S" ? "#FFD93D" : tierConf.from) + "AA";
    ctx.shadowBlur = 22;
    ctx.fillStyle = chipGrad;
    roundRect(ctx, chipX, chipY, chipW, chipH, 20);
    ctx.fill();
    ctx.restore();

    // Subtle inner highlight (top edge) for premium feel
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, chipX + 2, chipY + 2, chipW - 4, chipH / 2 - 2, 18);
    ctx.fill();
    ctx.restore();

    // Label — dark text on bright chip for max legibility
    ctx.fillStyle = "#0B0420";
    ctx.font = "900 22px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, SIZE / 2, chipY + chipH / 2 + 1);
    ctx.textBaseline = "alphabetic";
  }

  // ===== Prize image card (HERO) =====
  const cardSize = 620;
  const cardX = (SIZE - cardSize) / 2;
  const cardY = campaignName ? 230 : 210;

  // Glowing border
  ctx.shadowColor = tierConf.from + "CC";
  ctx.shadowBlur = 80;
  ctx.fillStyle = ribbonGrad;
  roundRect(ctx, cardX - 10, cardY - 10, cardSize + 20, cardSize + 20, 44);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Inner card
  const innerGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardSize);
  innerGrad.addColorStop(0, "#ffffff");
  innerGrad.addColorStop(1, "#f0f0f5");
  ctx.fillStyle = innerGrad;
  roundRect(ctx, cardX, cardY, cardSize, cardSize, 36);
  ctx.fill();

  // Prize image
  if (opts.imageUrl) {
    try {
      const img = await loadImage(opts.imageUrl);
      ctx.save();
      roundRect(ctx, cardX, cardY, cardSize, cardSize, 36);
      ctx.clip();
      const ratio = Math.min(cardSize / img.width, cardSize / img.height) * 0.92;
      const drawW = img.width * ratio;
      const drawH = img.height * ratio;
      const dx = cardX + (cardSize - drawW) / 2;
      const dy = cardY + (cardSize - drawH) / 2;
      ctx.drawImage(img, dx, dy, drawW, drawH);
      ctx.restore();
    } catch {
      ctx.fillStyle = "#1A0B3D";
      ctx.font = "260px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tierConf.emoji, cardX + cardSize / 2, cardY + cardSize / 2);
      ctx.textBaseline = "alphabetic";
    }
  } else {
    ctx.fillStyle = "#1A0B3D";
    ctx.font = "260px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tierConf.emoji, cardX + cardSize / 2, cardY + cardSize / 2);
    ctx.textBaseline = "alphabetic";
  }

  // Corner tier stamp on card (top-right)
  const stampR = 46;
  const stampX = cardX + cardSize - stampR - 18;
  const stampY = cardY + stampR + 18;
  ctx.shadowColor = "#00000055";
  ctx.shadowBlur = 12;
  ctx.fillStyle = ribbonGrad;
  ctx.beginPath();
  ctx.arc(stampX, stampY, stampR, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#0B0420";
  ctx.font = "900 44px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(opts.tier, stampX, stampY + 2);
  ctx.textBaseline = "alphabetic";

  // ===== Prize name (BIG, focus) =====
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 60px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";

  const nameLines = wrapText(ctx, opts.prize, SIZE - 100, 2);
  const nameLineH = 68;
  const namesBlockH = nameLines.length * nameLineH;
  const nameStartY = 920 - (namesBlockH - nameLineH) / 2;

  // Soft shadow behind text for legibility
  ctx.shadowColor = "#000000AA";
  ctx.shadowBlur = 16;
  nameLines.forEach((line, i) => {
    ctx.fillText(line, SIZE / 2, nameStartY + i * nameLineH);
  });
  ctx.shadowBlur = 0;

  // ===== Subtle watermark on prize card (bottom-right corner of image area) =====
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#0B0420";
  ctx.font = "600 14px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("bushidogacha.com", cardX + cardSize - 22, cardY + cardSize - 18);
  ctx.restore();

  // ===== Footer brand watermark (very subtle, single line) =====
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 14px system-ui, -apple-system, sans-serif";
  ctx.fillText("BUSHIDO GACHA  •  bushidogacha.com", SIZE / 2, SIZE - 28);
  ctx.restore();

  // ===== Decorative sparkles =====
  ctx.fillStyle = tierConf.from;
  const sparkles: Array<[number, number, number]> = [
    [70, 200, 6],
    [SIZE - 70, 200, 6],
    [50, 880, 5],
    [SIZE - 50, 880, 5],
    [120, 480, 4],
    [SIZE - 120, 480, 4],
    [90, 720, 3],
    [SIZE - 90, 720, 3],
  ];
  sparkles.forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });

  // JPEG @ 0.9 keeps the card sharp on FB/WA feeds while shrinking file size
  // dramatically vs PNG (~2–3 MB → ~250–500 KB). Background is fully opaque
  // so JPEG is safe — no transparency loss.
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to generate image"));
      },
      "image/jpeg",
      0.9,
    );
  });
}
