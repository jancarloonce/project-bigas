import { useEffect, useRef, useMemo } from "react";
import { SPRITES } from "../spriteConfig";

// ── constants ────────────────────────────────────────────────────────────────
const CANVAS_W = 512;
const CANVAS_H = 340;
const HALF_W   = 22;   // iso tile half-width
const HALF_H   = 11;   // iso tile half-height
const D        = 7;    // normal tile depth
const D_ROCK   = 15;   // rock depth
const D_SHED   = 34;   // shed depth
const RANGE    = 22;
const GRID     = 64;
const MINI_PX  = 100;
const MC       = MINI_PX / GRID;

// ── daytime farm palette ─────────────────────────────────────────────────────
// [top-face, left-face, right-face]
const TILE = {
  good:    ["#7cc850", "#5a9438", "#3c6420"],
  great:   ["#5cdc40", "#42a42c", "#286c18"],
  best:    ["#3cf058", "#28c040", "#14882a"],
  rock:    ["#9ab0b8", "#748090", "#505860"],
  shed:    ["#d05430", "#a02c10", "#6c1808"],
  planted: ["#6a4c28", "#4c3418", "#301e0c"],
  growing: ["#5cbc40", "#409028", "#285e18"],
  ripe:    ["#f0c028", "#c09018", "#887008"],
};

const GRID_LINE = "rgba(0,0,0,0.15)";

// ── grid state builder ───────────────────────────────────────────────────────
function buildGridState(replay, cycleIndex, tickIndex) {
  if (!replay) return null;
  const grid = {};
  for (const cell of replay.initial_grid.cells)
    grid[`${cell.x},${cell.y}`] = { ...cell };
  const cycle = replay.cycles[cycleIndex];
  if (!cycle) return grid;
  for (const key in grid) {
    const c = grid[key];
    if (["planted","growing","ripe"].includes(c.type))
      grid[key] = { ...c, type:"empty", growth_ticks:0 };
  }
  for (let i = 0; i <= tickIndex && i < cycle.ticks.length; i++)
    for (const ch of cycle.ticks[i].cell_changes || []) {
      const key = `${ch.x},${ch.y}`;
      grid[key] = { ...grid[key], ...ch };
    }
  return grid;
}

// ── isometric helpers ─────────────────────────────────────────────────────────
function iso(gx, gy, ox, oy) {
  return [(gx - gy) * HALF_W + ox, (gx + gy) * HALF_H + oy];
}

function isoBlock(ctx, sx, sy, [top, lft, rgt], depth) {
  ctx.fillStyle = rgt;
  ctx.beginPath();
  ctx.moveTo(sx,          sy + HALF_H);
  ctx.lineTo(sx + HALF_W, sy);
  ctx.lineTo(sx + HALF_W, sy + depth);
  ctx.lineTo(sx,          sy + HALF_H + depth);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = lft;
  ctx.beginPath();
  ctx.moveTo(sx - HALF_W, sy);
  ctx.lineTo(sx,          sy + HALF_H);
  ctx.lineTo(sx,          sy + HALF_H + depth);
  ctx.lineTo(sx - HALF_W, sy + depth);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(sx,          sy - HALF_H);
  ctx.lineTo(sx + HALF_W, sy);
  ctx.lineTo(sx,          sy + HALF_H);
  ctx.lineTo(sx - HALF_W, sy);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx,          sy - HALF_H);
  ctx.lineTo(sx + HALF_W, sy);
  ctx.lineTo(sx,          sy + HALF_H);
  ctx.lineTo(sx - HALF_W, sy);
  ctx.closePath();
  ctx.stroke();
}

// ── sprites ───────────────────────────────────────────────────────────────────
// (bx, by) = top tip of tile's top face = (sx, sy - HALF_H)

function spritePlanted(ctx, bx, by) {
  // tilled soil mound
  ctx.fillStyle = "#2c1808";
  ctx.fillRect(bx - 5, by - 1, 10, 2);
  ctx.fillRect(bx - 3, by - 2, 6, 1);
  // stem
  ctx.fillStyle = "#38a028";
  ctx.fillRect(bx - 1, by - 10, 2, 9);
  // leaf highlight on stem
  ctx.fillStyle = "#50c040";
  ctx.fillRect(bx - 1, by - 10, 1, 9);
  // left leaf
  ctx.fillStyle = "#48bc38";
  ctx.fillRect(bx - 6, by - 8, 5, 2);
  ctx.fillStyle = "#70dc58";
  ctx.fillRect(bx - 6, by - 8, 2, 1);
  // right leaf
  ctx.fillStyle = "#48bc38";
  ctx.fillRect(bx + 2,  by - 9, 5, 2);
  ctx.fillStyle = "#70dc58";
  ctx.fillRect(bx + 2,  by - 9, 2, 1);
  // tiny shoot tip
  ctx.fillStyle = "#90f070";
  ctx.fillRect(bx - 1, by - 11, 2, 2);
}

function spriteGrowing(ctx, bx, by) {
  // soil
  ctx.fillStyle = "#2c1808";
  ctx.fillRect(bx - 5, by - 1, 10, 2);
  // stalk (dark core + lit edge)
  ctx.fillStyle = "#207828";
  ctx.fillRect(bx - 1, by - 21, 2, 20);
  ctx.fillStyle = "#30a038";
  ctx.fillRect(bx - 1, by - 21, 1, 20);
  // lower leaf pair
  ctx.fillStyle = "#38ac40";
  ctx.fillRect(bx - 9, by - 13, 8, 3);
  ctx.fillRect(bx + 2,  by - 15, 8, 3);
  ctx.fillStyle = "#60d460";
  ctx.fillRect(bx - 9, by - 13, 3, 1);
  ctx.fillRect(bx + 2,  by - 15, 3, 1);
  // upper leaf pair
  ctx.fillStyle = "#38ac40";
  ctx.fillRect(bx - 7, by - 18, 6, 2);
  ctx.fillRect(bx + 2,  by - 19, 6, 2);
  ctx.fillStyle = "#60d460";
  ctx.fillRect(bx - 7, by - 18, 2, 1);
  ctx.fillRect(bx + 2,  by - 19, 2, 1);
  // top bud
  ctx.fillStyle = "#50c848";
  ctx.fillRect(bx - 3, by - 23, 6, 3);
  ctx.fillStyle = "#80e870";
  ctx.fillRect(bx - 2, by - 23, 3, 1);
}

function spriteRipe(ctx, bx, by, pulse) {
  const sway = Math.round(Math.sin(pulse * Math.PI * 2) * 1);
  const g = Math.round(pulse * 14);
  // soil
  ctx.fillStyle = "#2c1808";
  ctx.fillRect(bx - 4, by - 1, 8, 2);
  // lower stalk (dry)
  ctx.fillStyle = "#907018";
  ctx.fillRect(bx - 1 + sway, by - 24, 2, 23);
  ctx.fillStyle = "#b89028";
  ctx.fillRect(bx - 1 + sway, by - 24, 1, 23);
  // wheat head body
  const wx = bx + sway;
  ctx.fillStyle = `rgb(${214+g},${152+g},16)`;
  ctx.fillRect(wx - 5, by - 28, 11, 5);
  // grain segments (upper row)
  ctx.fillStyle = `rgb(${234+g},${182+g},26)`;
  ctx.fillRect(wx - 4, by - 31, 3, 4);
  ctx.fillRect(wx - 1, by - 31, 3, 4);
  ctx.fillRect(wx + 2, by - 31, 3, 4);
  // grain segments (lower row)
  ctx.fillRect(wx - 5, by - 28, 3, 3);
  ctx.fillRect(wx - 2, by - 28, 3, 3);
  ctx.fillRect(wx + 1, by - 28, 3, 3);
  ctx.fillRect(wx + 4, by - 28, 2, 3);
  // grain highlights
  ctx.fillStyle = `rgb(${252+g},${218+g},50)`;
  ctx.fillRect(wx - 4, by - 31, 1, 1);
  ctx.fillRect(wx - 1, by - 31, 1, 1);
  ctx.fillRect(wx + 2, by - 31, 1, 1);
  // awns (spiky tops)
  ctx.fillStyle = `rgb(${248+g},${210+g},40)`;
  ctx.fillRect(wx - 4, by - 35, 1, 5);
  ctx.fillRect(wx - 1, by - 37, 1, 7);
  ctx.fillRect(wx + 2, by - 36, 1, 6);
  ctx.fillRect(wx + 5, by - 32, 1, 3);
  ctx.fillRect(wx - 6, by - 31, 1, 3);
  // glow bloom
  if (pulse > 0.15) {
    ctx.fillStyle = `rgba(245,200,20,${(pulse * 0.13).toFixed(2)})`;
    ctx.fillRect(bx - 14, by - 40, 28, 22);
  }
}

function spriteShedRoof(ctx, bx, by) {
  // left slope (lit face)
  ctx.fillStyle = "#d83030";
  ctx.beginPath();
  ctx.moveTo(bx,               by - 14);
  ctx.lineTo(bx - HALF_W - 6, by + HALF_H + 2);
  ctx.lineTo(bx,               by + HALF_H + 4);
  ctx.closePath();
  ctx.fill();
  // right slope (shaded face)
  ctx.fillStyle = "#8c1818";
  ctx.beginPath();
  ctx.moveTo(bx,               by - 14);
  ctx.lineTo(bx + HALF_W + 6, by + HALF_H + 2);
  ctx.lineTo(bx,               by + HALF_H + 4);
  ctx.closePath();
  ctx.fill();
  // eave edge trim
  ctx.strokeStyle = "#e8c878";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx - HALF_W - 6, by + HALF_H + 2);
  ctx.lineTo(bx,               by - 14);
  ctx.lineTo(bx + HALF_W + 6, by + HALF_H + 2);
  ctx.stroke();
  // ridge line
  ctx.strokeStyle = "#f04040";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(bx, by - 14);
  ctx.lineTo(bx, by + HALF_H + 4);
  ctx.stroke();
}

function spriteFarmer(ctx, bx, by) {
  const base = by + 2;

  // drop shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(bx - 5, base - 1, 10, 3);

  // boots (dark brown leather)
  ctx.fillStyle = "#3c2010";
  ctx.fillRect(bx - 4, base - 6, 3, 6);
  ctx.fillRect(bx + 1,  base - 6, 3, 6);
  ctx.fillStyle = "#543018";
  ctx.fillRect(bx - 4, base - 6, 1, 4);
  ctx.fillRect(bx + 1,  base - 6, 1, 4);

  // blue denim overalls
  ctx.fillStyle = "#2848a8";
  ctx.fillRect(bx - 4, base - 12, 4, 7);
  ctx.fillRect(bx,     base - 12, 4, 7);
  ctx.fillStyle = "#3060c8";
  ctx.fillRect(bx - 4, base - 12, 1, 7);
  ctx.fillRect(bx,     base - 12, 1, 7);

  // red plaid shirt / arms
  ctx.fillStyle = "#b83020";
  ctx.fillRect(bx - 8, base - 21, 3, 8);
  ctx.fillRect(bx + 5,  base - 21, 3, 8);
  ctx.fillStyle = "#d84030";
  ctx.fillRect(bx - 8, base - 20, 3, 1);
  ctx.fillRect(bx - 8, base - 17, 3, 1);
  ctx.fillRect(bx + 5,  base - 20, 3, 1);
  ctx.fillRect(bx + 5,  base - 17, 3, 1);

  // overall bib (blue)
  ctx.fillStyle = "#3060c8";
  ctx.fillRect(bx - 2, base - 21, 5, 9);
  ctx.fillStyle = "#4878e0";
  ctx.fillRect(bx - 2, base - 21, 2, 2);  // pocket

  // hands (skin)
  ctx.fillStyle = "#d8904c";
  ctx.fillRect(bx - 8, base - 14, 3, 4);
  ctx.fillRect(bx + 5,  base - 14, 3, 4);

  // neck
  ctx.fillStyle = "#d8904c";
  ctx.fillRect(bx - 1, base - 24, 3, 3);

  // head
  ctx.fillStyle = "#d8904c";
  ctx.fillRect(bx - 4, base - 33, 9, 9);
  // jaw shadow
  ctx.fillStyle = "#b87040";
  ctx.fillRect(bx - 3, base - 25, 7, 1);
  // eyes
  ctx.fillStyle = "#1c0c08";
  ctx.fillRect(bx - 2, base - 30, 2, 2);
  ctx.fillRect(bx + 1,  base - 30, 2, 2);
  // eye shine
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(bx - 1, base - 30, 1, 1);
  ctx.fillRect(bx + 2,  base - 30, 1, 1);
  // smile
  ctx.fillStyle = "#8c4020";
  ctx.fillRect(bx - 2, base - 27, 1, 1);
  ctx.fillRect(bx,     base - 26, 3, 1);
  ctx.fillRect(bx + 2,  base - 27, 1, 1);

  // straw hat brim
  ctx.fillStyle = "#c8a020";
  ctx.fillRect(bx - 7, base - 34, 15, 2);
  ctx.fillStyle = "#e0b828";
  ctx.fillRect(bx - 6, base - 34, 13, 1);
  // hat body
  ctx.fillStyle = "#e8b828";
  ctx.fillRect(bx - 4, base - 43, 9, 10);
  // hat highlight (left + top)
  ctx.fillStyle = "#f8d040";
  ctx.fillRect(bx - 4, base - 43, 3, 10);
  ctx.fillRect(bx - 4, base - 43, 9, 2);
  // hat shadow
  ctx.fillStyle = "#9c7010";
  ctx.fillRect(bx + 3,  base - 43, 2, 10);
  ctx.fillRect(bx - 4, base - 35, 9, 1);
  // hat band (red)
  ctx.fillStyle = "#c82820";
  ctx.fillRect(bx - 4, base - 36, 8, 2);
  ctx.fillStyle = "#e03030";
  ctx.fillRect(bx - 4, base - 36, 3, 1);
}

// ── minimap ───────────────────────────────────────────────────────────────────
const MINI_C = {
  shed:"#d05430", rock:"#9ab0b8",
  planted:"#6a4c28", growing:"#5cbc40", ripe:"#f0c028",
  good:"#7cc850", great:"#5cdc40", best:"#3cf058",
};

function renderMinimap(mCtx, gridState, farmer) {
  mCtx.fillStyle = "#2a5010";
  mCtx.fillRect(0, 0, MINI_PX, MINI_PX);
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const c = gridState[`${x},${y}`];
      if (!c) continue;
      mCtx.fillStyle =
        c.type === "empty" ? (MINI_C[c.soil] || MINI_C.good)
        : (MINI_C[c.type] || MINI_C.good);
      mCtx.fillRect(x * MC, (GRID - 1 - y) * MC, Math.max(1, MC), Math.max(1, MC));
    }
  }
  if (farmer) {
    mCtx.fillStyle = "#ff6b35";
    mCtx.fillRect(farmer.x * MC - 1, (GRID - 1 - farmer.y) * MC - 1, MC + 2, MC + 2);
  }
}

// ── component ─────────────────────────────────────────────────────────────────
export default function GridVisualizer({ replay, cycleIndex, tickIndex }) {
  const canvasRef      = useRef(null);
  const miniRef        = useRef(null);
  const rafRef         = useRef(null);
  const gridStateRef   = useRef(null);
  const farmerRef      = useRef(null);
  const tickRef        = useRef(null);
  const camRef         = useRef({ ox: CANVAS_W / 2, oy: CANVAS_H * 0.5 });
  const spritesRef     = useRef({});   // loaded Image objects keyed by sprite name

  const gridState = useMemo(
    () => buildGridState(replay, cycleIndex, tickIndex),
    [replay, cycleIndex, tickIndex]
  );

  const farmer = useMemo(() => {
    if (!replay) return null;
    const cycle = replay.cycles[cycleIndex];
    return cycle?.ticks[tickIndex]?.farmer ?? null;
  }, [replay, cycleIndex, tickIndex]);

  const tick = replay?.cycles?.[cycleIndex]?.ticks?.[tickIndex];

  useEffect(() => { gridStateRef.current = gridState; }, [gridState]);
  useEffect(() => { farmerRef.current = farmer; }, [farmer]);
  useEffect(() => { tickRef.current = tick; }, [tick]);

  // Preload any configured sprite images once on mount
  useEffect(() => {
    for (const [name, cfg] of Object.entries(SPRITES)) {
      if (!cfg.src) continue;
      const img = new Image();
      img.onload  = () => { spritesRef.current[name] = img; };
      img.onerror = () => console.warn(`[sprites] failed to load "${name}" from ${cfg.src}`);
      img.src = cfg.src;
    }
  }, []);

  useEffect(() => {
    const f0 = farmerRef.current;
    if (f0) {
      camRef.current.ox = CANVAS_W / 2 - (f0.x - f0.y) * HALF_W;
      camRef.current.oy = CANVAS_H * 0.5  - (f0.x + f0.y) * HALF_H;
    }

    let alive = true;
    function frame(ts) {
      if (!alive) return;
      const pulse = (Math.sin(ts / 380) + 1) / 2;
      drawFrame(ts, pulse);
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Returns true if a configured PNG was drawn; false = caller should draw procedurally
  function trySprite(ctx, name, bx, by) {
    const img = spritesRef.current[name];
    const cfg = SPRITES[name];
    if (!img || !cfg) return false;
    const dx = bx + cfg.ox, dy = by + cfg.oy;
    if (cfg.clip) {
      const c = cfg.clip;
      ctx.drawImage(img, c.x, c.y, c.w, c.h, dx, dy, cfg.w, cfg.h);
    } else {
      ctx.drawImage(img, dx, dy, cfg.w, cfg.h);
    }
    return true;
  }

  function drawFrame(ts, pulse) {
    const canvas = canvasRef.current;
    const gridState = gridStateRef.current;
    if (!canvas || !gridState) return;
    const ctx = canvas.getContext("2d");

    const farmer = farmerRef.current;
    const fx = farmer?.x ?? 1;
    const fy = farmer?.y ?? 0;

    // Smooth camera
    const targetOx = CANVAS_W / 2 - (fx - fy) * HALF_W;
    const targetOy = CANVAS_H * 0.5  - (fx + fy) * HALF_H;
    const cam = camRef.current;
    cam.ox += (targetOx - cam.ox) * 0.14;
    cam.oy += (targetOy - cam.oy) * 0.14;
    const ox = cam.ox;
    const oy = cam.oy;

    // Daytime sky gradient
    const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bg.addColorStop(0, "#5898d0");
    bg.addColorStop(1, "#90bce0");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Collect cells in range, sort back→front
    const cells = [];
    for (let gx = Math.max(0, fx - RANGE); gx <= Math.min(GRID-1, fx + RANGE); gx++)
      for (let gy = Math.max(0, fy - RANGE); gy <= Math.min(GRID-1, fy + RANGE); gy++)
        cells.push({ gx, gy });
    cells.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));

    for (const { gx, gy } of cells) {
      const cell = gridState[`${gx},${gy}`];
      if (!cell) continue;

      const [sx, sy] = iso(gx, gy, ox, oy);

      if (sx + HALF_W < 0 || sx - HALF_W > CANVAS_W) continue;
      if (sy - HALF_H - 50 > CANVAS_H || sy + D_SHED + 16 < 0) continue;

      const bx = sx;
      const by = sy - HALF_H;

      if (cell.type === "empty") {
        const colors = TILE[cell.soil] || TILE.good;
        isoBlock(ctx, sx, sy, colors, D);
        // "best" soil gets a sparkle shimmer
        if (cell.soil === "best") {
          ctx.fillStyle = `rgba(60,240,88,${(0.08 + pulse * 0.08).toFixed(2)})`;
          ctx.beginPath();
          ctx.moveTo(sx, by); ctx.lineTo(sx+HALF_W, sy); ctx.lineTo(sx, sy+HALF_H); ctx.lineTo(sx-HALF_W, sy);
          ctx.closePath(); ctx.fill();
        }
        // grass tufts on good/great tiles
        if (cell.soil !== "best" && ((gx * 7 + gy * 13) % 5 === 0)) {
          ctx.fillStyle = "#286010";
          ctx.fillRect(sx - 3, by + 2, 1, 3);
          ctx.fillRect(sx + 1,  by + 3, 1, 2);
          ctx.fillRect(sx - 1, by + 4, 1, 2);
        }

      } else if (cell.type === "rock") {
        isoBlock(ctx, sx, sy, TILE.rock, D_ROCK);
        if (!trySprite(ctx, "rock", bx, by)) {
          // rock highlight on top face
          ctx.fillStyle = "#c8d8e0";
          ctx.fillRect(sx - 5, by + 3, 4, 2);
          ctx.fillRect(sx - 2, by + 2, 3, 1);
          // cracks
          ctx.fillStyle = "#404c54";
          ctx.fillRect(sx - 4, by + 5, 2, 6);
          ctx.fillRect(sx + 2,  by + 7, 5, 2);
          ctx.fillRect(sx - 1, by + 8, 3, 3);
          // moss
          ctx.fillStyle = "#507840";
          ctx.fillRect(sx + 3,  by + 3, 3, 2);
          ctx.fillRect(sx + 4,  by + 2, 2, 1);
        }

      } else if (cell.type === "shed") {
        isoBlock(ctx, sx, sy, TILE.shed, D_SHED);
        if (!trySprite(ctx, "shed", bx, by)) {
          spriteShedRoof(ctx, bx, sy - HALF_H - D_SHED);
          // barn door on right face
          ctx.fillStyle = "#3c1808";
          ctx.beginPath();
          ctx.moveTo(sx + 5,      sy + 5);
          ctx.lineTo(sx + HALF_W, sy - 3);
          ctx.lineTo(sx + HALF_W, sy + D_SHED - 4);
          ctx.lineTo(sx + 5,      sy + HALF_H + D_SHED - 7);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = "#6c2808";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx + 5, sy + 5);
          ctx.lineTo(sx + HALF_W, sy + D_SHED - 4);
          ctx.moveTo(sx + HALF_W, sy - 3);
          ctx.lineTo(sx + 5, sy + HALF_H + D_SHED - 7);
          ctx.stroke();
          // loft window on left face
          ctx.fillStyle = "#a8e0f8";
          ctx.fillRect(sx - 16, sy + 5, 8, 6);
          ctx.fillStyle = "rgba(0,0,0,0.2)";
          ctx.fillRect(sx - 16, sy + 8, 8, 1);
          ctx.fillRect(sx - 12, sy + 5, 1, 6);
          ctx.strokeStyle = "#6c3010";
          ctx.lineWidth = 1;
          ctx.strokeRect(sx - 16, sy + 5, 8, 6);
        }

      } else if (cell.type === "planted") {
        isoBlock(ctx, sx, sy, TILE.planted, D);
        if (!trySprite(ctx, "planted", bx, by)) spritePlanted(ctx, bx, by);

      } else if (cell.type === "growing") {
        isoBlock(ctx, sx, sy, TILE.growing, D);
        if (!trySprite(ctx, "growing", bx, by)) spriteGrowing(ctx, bx, by);

      } else if (cell.type === "ripe") {
        isoBlock(ctx, sx, sy, TILE.ripe, D);
        if (!trySprite(ctx, "ripe", bx, by)) spriteRipe(ctx, bx, by, pulse);
      }

      // Farmer drawn when we reach their cell
      if (farmer && gx === farmer.x && gy === farmer.y) {
        const isMoving = tickRef.current?.action?.action === "move";
        const bob = isMoving ? Math.round(Math.sin(ts / 80) * 3.5) : 0;
        if (!trySprite(ctx, "farmer", bx, by + bob)) spriteFarmer(ctx, bx, by + bob);
      }
    }

    // Vignette fading to sky color
    const BG = "80,140,200";
    const vig = ctx.createRadialGradient(
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.08,
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.58
    );
    vig.addColorStop(0.00, `rgba(${BG},0)`);
    vig.addColorStop(0.45, `rgba(${BG},0.06)`);
    vig.addColorStop(0.70, `rgba(${BG},0.55)`);
    vig.addColorStop(0.88, `rgba(${BG},0.90)`);
    vig.addColorStop(1.00, `rgba(${BG},1)`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Minimap
    const mini = miniRef.current;
    if (mini) renderMinimap(mini.getContext("2d"), gridState, farmer);
  }

  const action = tick?.action;
  const actionLabel = (() => {
    if (!action || !action.action) return "—";
    if (action.action === "move")
      return `MOVE ${action.dx>0?"→":action.dx<0?"←":""}${action.dy>0?"↑":action.dy<0?"↓":""}`;
    if (action.action === "get_seeds")
      return `GET ${action.n||1} SEED${(action.n||1)>1?"S":""}`;
    return (action.action).toUpperCase().replace(/_/g," ");
  })();

  return (
    <div className="space-y-2">
      {/* Main iso viewport */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="border-2 border-[#3e5260] shadow-pixel w-full block"
          style={{ imageRendering: "pixelated", maxWidth: CANVAS_W }}
        />

        {/* Minimap overlay */}
        <div className="absolute bottom-2 right-2 border-2 border-[#3e5260] opacity-80 hover:opacity-100 transition-opacity">
          <canvas
            ref={miniRef}
            width={MINI_PX}
            height={MINI_PX}
            style={{ imageRendering: "pixelated", display: "block" }}
          />
        </div>

        {/* Coordinates badge */}
        {farmer && (
          <div className="absolute top-2 left-2 bg-black/55 border border-[#3e5260]/80 px-2 py-1">
            <span className="font-pixel text-xs text-parchment/80">
              ({farmer.x},{farmer.y})
            </span>
          </div>
        )}
      </div>

      {/* Stats bar */}
      {tick && (
        <div className="grid grid-cols-4 gap-1">
          {[
            { label:"AP",     value: tick.ap_remaining },
            { label:"ACTION", value: actionLabel },
            { label:"SEEDS",  value: tick.farmer?.seeds ?? 0 },
            { label:"RICE",   value:`${(tick.farmer?.rice_grams??0).toLocaleString()}g`},
          ].map(({ label, value }) => (
            <div key={label} className="bg-soil border border-rock px-2 py-1 text-center">
              <div className="font-pixel text-xs text-rock leading-none mb-1">{label}</div>
              <div className="font-pixel text-xs text-parchment leading-none truncate">{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
