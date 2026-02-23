import { useEffect, useRef, useMemo } from "react";

// ── constants ────────────────────────────────────────────────────────────────
const CANVAS_W = 512;
const CANVAS_H = 340;
const HALF_W   = 22;   // iso tile half-width  → tile face = 44px wide
const HALF_H   = 11;   // iso tile half-height → tile face = 22px tall
const D        = 7;    // normal tile depth
const D_ROCK   = 15;   // rock depth
const D_SHED   = 34;   // shed depth (tall building)
const RANGE    = 22;   // cells rendered each direction from farmer (must exceed vignette edge)
const GRID     = 64;
const MINI_PX  = 100;
const MC       = MINI_PX / GRID;

// ── fresh palette (no brown) ─────────────────────────────────────────────────
// tile colors: [top-face, left-face, right-face]
const TILE = {
  good:    ["#247a52", "#18583c", "#0e3e28"],
  great:   ["#2ca068", "#1e744c", "#125234"],
  best:    ["#34c87e", "#26966a", "#186850"],
  rock:    ["#5c7488", "#3e5260", "#28384a"],
  shed:    ["#e83030", "#aa1010", "#720808"],
  planted: ["#1a5c36", "#104022", "#083014"],
  growing: ["#2ea85e", "#207c44", "#14582e"],
  ripe:    ["#f5c018", "#c09010", "#887008"],
};

const GRID_LINE = "rgba(0,0,0,0.18)";

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
// (sx, sy) = center of top-face diamond for grid cell (gx, gy)
function iso(gx, gy, ox, oy) {
  return [(gx - gy) * HALF_W + ox, (gx + gy) * HALF_H + oy];
}

// Draw a 3-face isometric block.
// (sx, sy) = center of the top diamond; depth = how far sides extend downward.
function isoBlock(ctx, sx, sy, [top, lft, rgt], depth) {
  // right face
  ctx.fillStyle = rgt;
  ctx.beginPath();
  ctx.moveTo(sx,          sy + HALF_H);
  ctx.lineTo(sx + HALF_W, sy);
  ctx.lineTo(sx + HALF_W, sy + depth);
  ctx.lineTo(sx,          sy + HALF_H + depth);
  ctx.closePath();
  ctx.fill();
  // left face
  ctx.fillStyle = lft;
  ctx.beginPath();
  ctx.moveTo(sx - HALF_W, sy);
  ctx.lineTo(sx,          sy + HALF_H);
  ctx.lineTo(sx,          sy + HALF_H + depth);
  ctx.lineTo(sx - HALF_W, sy + depth);
  ctx.closePath();
  ctx.fill();
  // top face
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(sx,          sy - HALF_H);
  ctx.lineTo(sx + HALF_W, sy);
  ctx.lineTo(sx,          sy + HALF_H);
  ctx.lineTo(sx - HALF_W, sy);
  ctx.closePath();
  ctx.fill();
  // subtle edge on top face
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

// ── sprites (all drawn in 2-D screen space above tile tip) ───────────────────
// (bx, by) = top tip of tile's top face = (sx, sy - HALF_H)

function spritePlanted(ctx, bx, by) {
  ctx.fillStyle = "#30b860";
  ctx.fillRect(bx - 1, by - 9,  2, 8);   // stem
  ctx.fillRect(bx - 5, by - 7,  4, 2);   // left leaf
  ctx.fillRect(bx + 1,  by - 8,  4, 2);   // right leaf
  ctx.fillStyle = "#48d878";
  ctx.fillRect(bx - 1, by - 10, 2, 2);   // tip
  ctx.fillRect(bx - 5, by - 8,  1, 1);
  ctx.fillRect(bx + 1,  by - 9,  1, 1);
}

function spriteGrowing(ctx, bx, by) {
  ctx.fillStyle = "#1e8040";
  ctx.fillRect(bx - 1, by - 18, 2, 16);  // stalk
  ctx.fillStyle = "#30c060";
  ctx.fillRect(bx - 7, by - 13, 6, 2);   // left leaf
  ctx.fillRect(bx + 2,  by - 15, 6, 2);   // right leaf
  ctx.fillRect(bx - 3, by - 18, 6, 3);   // top tuft
  ctx.fillStyle = "#50e080";              // leaf highlights
  ctx.fillRect(bx - 7, by - 14, 2, 1);
  ctx.fillRect(bx + 2,  by - 16, 2, 1);
  ctx.fillRect(bx - 1, by - 18, 2, 1);
}

function spriteRipe(ctx, bx, by, pulse) {
  const g = Math.round(pulse * 20);
  // stalk
  ctx.fillStyle = "#a08010";
  ctx.fillRect(bx - 1, by - 22, 2, 18);
  // grain cluster base
  ctx.fillStyle = `rgb(${228+g},${168+g},8)`;
  ctx.fillRect(bx - 5, by - 24, 10, 4);
  ctx.fillRect(bx - 8, by - 22, 4,  3);
  ctx.fillRect(bx + 4,  by - 22, 4,  3);
  // bright grain tips
  ctx.fillStyle = `rgb(${248+g},${208+g},30)`;
  ctx.fillRect(bx - 3, by - 26, 6,  3);
  ctx.fillRect(bx - 6, by - 24, 2,  2);
  ctx.fillRect(bx + 4,  by - 24, 2,  2);
  // glow bloom
  if (pulse > 0.15) {
    ctx.fillStyle = `rgba(245,200,20,${(pulse * 0.16).toFixed(2)})`;
    ctx.fillRect(bx - 14, by - 32, 28, 22);
  }
}

function spriteShedRoof(ctx, bx, by) {
  // Drawn at the tip of the shed's top face (above the big block)
  // Two angled faces of a pitched roof
  ctx.fillStyle = "#8a0808";
  ctx.beginPath();
  ctx.moveTo(bx,               by - 12);   // peak
  ctx.lineTo(bx + HALF_W + 5, by + HALF_H + 2);
  ctx.lineTo(bx - HALF_W - 5, by + HALF_H + 2);
  ctx.closePath();
  ctx.fill();
  // bright left half
  ctx.fillStyle = "#cc1414";
  ctx.beginPath();
  ctx.moveTo(bx,               by - 12);
  ctx.lineTo(bx - HALF_W - 5, by + HALF_H + 2);
  ctx.lineTo(bx,               by + HALF_H + 4);
  ctx.closePath();
  ctx.fill();
  // bright right half
  ctx.fillStyle = "#e83030";
  ctx.beginPath();
  ctx.moveTo(bx,               by - 12);
  ctx.lineTo(bx + HALF_W + 5, by + HALF_H + 2);
  ctx.lineTo(bx,               by + HALF_H + 4);
  ctx.closePath();
  ctx.fill();
  // ridge line
  ctx.strokeStyle = "#ff5050";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(bx, by - 12);
  ctx.lineTo(bx, by + HALF_H + 4);
  ctx.stroke();
}

function spriteFarmer(ctx, bx, by) {
  // by = top tip of farmer's tile → farmer stands on the surface
  const base = by + 2;   // feet level

  // drop shadow
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.fillRect(bx - 5, base - 1, 10, 3);

  // boots
  ctx.fillStyle = "#1a2a50";
  ctx.fillRect(bx - 4, base - 6, 3, 6);
  ctx.fillRect(bx + 1,  base - 6, 3, 6);
  // legs
  ctx.fillStyle = "#263870";
  ctx.fillRect(bx - 4, base - 10, 4, 5);
  ctx.fillRect(bx,     base - 10, 4, 5);
  // trouser highlight
  ctx.fillStyle = "#3248a0";
  ctx.fillRect(bx - 4, base - 10, 4, 1);
  ctx.fillRect(bx,     base - 10, 4, 1);

  // torso / shirt
  ctx.fillStyle = "#0d6e60";
  ctx.fillRect(bx - 5, base - 20, 10, 11);
  ctx.fillStyle = "#10887a";
  ctx.fillRect(bx - 5, base - 20, 10, 3);  // collar area
  ctx.fillRect(bx - 5, base - 20, 2, 11);  // left edge highlight

  // arms
  ctx.fillStyle = "#0d6e60";
  ctx.fillRect(bx - 8, base - 19, 3, 7);
  ctx.fillRect(bx + 5,  base - 19, 3, 7);

  // hands (skin)
  ctx.fillStyle = "#c88858";
  ctx.fillRect(bx - 8, base - 13, 3, 4);
  ctx.fillRect(bx + 5,  base - 13, 3, 4);

  // neck
  ctx.fillStyle = "#c88858";
  ctx.fillRect(bx - 1, base - 22, 2, 3);

  // head
  ctx.fillStyle = "#c88858";
  ctx.fillRect(bx - 4, base - 31, 8, 9);
  ctx.fillStyle = "#b87040";    // jaw shadow
  ctx.fillRect(bx - 3, base - 23, 6, 1);
  // eyes
  ctx.fillStyle = "#1a0c06";
  ctx.fillRect(bx - 2, base - 28, 2, 2);
  ctx.fillRect(bx + 1,  base - 28, 2, 2);
  // eye shine
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(bx - 1, base - 28, 1, 1);
  ctx.fillRect(bx + 2,  base - 28, 1, 1);

  // hat brim
  ctx.fillStyle = "#c8a828";
  ctx.fillRect(bx - 6, base - 32, 12, 2);
  // hat body
  ctx.fillStyle = "#e8c030";
  ctx.fillRect(bx - 4, base - 39, 8, 8);
  // hat shadow on brim
  ctx.fillStyle = "#a08818";
  ctx.fillRect(bx + 3,  base - 39, 1, 8);
  ctx.fillRect(bx - 4, base - 32, 8, 1);
  // hat band
  ctx.fillStyle = "#10887a";
  ctx.fillRect(bx - 4, base - 33, 7, 1);
}

// ── minimap ───────────────────────────────────────────────────────────────────
const MINI_C = {
  shed:"#e83030", rock:"#5c7488",
  planted:"#1a5c36", growing:"#2ea85e", ripe:"#f5c018",
  good:"#247a52", great:"#2ca068", best:"#34c87e",
};

function renderMinimap(mCtx, gridState, farmer) {
  mCtx.fillStyle = "#080f18";
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
  // Refs hold the latest values without causing the RAF to restart
  const gridStateRef   = useRef(null);
  const farmerRef      = useRef(null);
  const tickRef        = useRef(null);
  // Smooth camera — lerps toward the farmer position every frame
  const camRef         = useRef({ ox: CANVAS_W / 2, oy: CANVAS_H * 0.5 });

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

  // Keep refs in sync — no need to restart the RAF when these change
  useEffect(() => { gridStateRef.current = gridState; }, [gridState]);
  useEffect(() => { farmerRef.current = farmer; }, [farmer]);
  useEffect(() => { tickRef.current = tick; }, [tick]);

  // Single stable RAF loop — empty deps so it never restarts
  useEffect(() => {
    // Snap camera to initial farmer pos so first frame isn't wrong
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

  function drawFrame(ts, pulse) {
    const canvas = canvasRef.current;
    const gridState = gridStateRef.current;
    if (!canvas || !gridState) return;
    const ctx = canvas.getContext("2d");

    const farmer = farmerRef.current;
    const fx = farmer?.x ?? 1;
    const fy = farmer?.y ?? 0;

    // Smooth camera: lerp toward the target each frame so the farmer sprite
    // visibly slides across the screen when they move.
    const targetOx = CANVAS_W / 2 - (fx - fy) * HALF_W;
    const targetOy = CANVAS_H * 0.5  - (fx + fy) * HALF_H;
    const cam = camRef.current;
    cam.ox += (targetOx - cam.ox) * 0.14;
    cam.oy += (targetOy - cam.oy) * 0.14;
    const ox = cam.ox;
    const oy = cam.oy;

    // Sky gradient — matches the vignette fade colour (#060e1a)
    const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bg.addColorStop(0, "#0a1828");
    bg.addColorStop(1, "#060e1a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Collect cells in range, sort back→front (ascending gx+gy)
    const cells = [];
    for (let gx = Math.max(0, fx - RANGE); gx <= Math.min(GRID-1, fx + RANGE); gx++)
      for (let gy = Math.max(0, fy - RANGE); gy <= Math.min(GRID-1, fy + RANGE); gy++)
        cells.push({ gx, gy });
    cells.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));

    for (const { gx, gy } of cells) {
      const cell = gridState[`${gx},${gy}`];
      if (!cell) continue;

      const [sx, sy] = iso(gx, gy, ox, oy);

      // Cull off-screen tiles
      if (sx + HALF_W < 0 || sx - HALF_W > CANVAS_W) continue;
      if (sy - HALF_H - 50 > CANVAS_H || sy + D_SHED + 16 < 0) continue;

      const bx = sx;
      const by = sy - HALF_H;   // top tip of this tile's top face

      if (cell.type === "empty") {
        const colors = TILE[cell.soil] || TILE.good;
        isoBlock(ctx, sx, sy, colors, D);
        // subtle soil quality shimmer for "best"
        if (cell.soil === "best") {
          ctx.fillStyle = "rgba(52,200,126,0.14)";
          ctx.beginPath();
          ctx.moveTo(sx, by); ctx.lineTo(sx+HALF_W, sy); ctx.lineTo(sx, sy+HALF_H); ctx.lineTo(sx-HALF_W, sy);
          ctx.closePath(); ctx.fill();
        }

      } else if (cell.type === "rock") {
        isoBlock(ctx, sx, sy, TILE.rock, D_ROCK);
        // crack detail on top face
        ctx.fillStyle = TILE.rock[2];
        ctx.fillRect(sx - 4, by + 4, 2, 7);
        ctx.fillRect(sx + 3,  by + 6, 4, 2);

      } else if (cell.type === "shed") {
        isoBlock(ctx, sx, sy, TILE.shed, D_SHED);
        // roof above block top
        spriteShedRoof(ctx, bx, sy - HALF_H - D_SHED);
        // door on right face
        ctx.fillStyle = "#3d0808";
        ctx.beginPath();
        ctx.moveTo(sx + 4,      sy + 4);
        ctx.lineTo(sx + HALF_W, sy - 4);
        ctx.lineTo(sx + HALF_W, sy + D_SHED - 4);
        ctx.lineTo(sx + 4,      sy + HALF_H + D_SHED - 6);
        ctx.closePath(); ctx.fill();
        // window on left face
        ctx.fillStyle = "#f0a820";
        ctx.fillRect(sx - 14, sy + 4, 6, 6);
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(sx - 14, sy + 7, 6, 1);
        ctx.fillRect(sx - 11, sy + 4, 1, 6);

      } else if (cell.type === "planted") {
        isoBlock(ctx, sx, sy, TILE.planted, D);
        spritePlanted(ctx, bx, by);

      } else if (cell.type === "growing") {
        isoBlock(ctx, sx, sy, TILE.growing, D);
        spriteGrowing(ctx, bx, by);

      } else if (cell.type === "ripe") {
        isoBlock(ctx, sx, sy, TILE.ripe, D);
        spriteRipe(ctx, bx, by, pulse);
      }

      // Farmer drawn when we reach their cell in sort order
      if (farmer && gx === farmer.x && gy === farmer.y) {
        // Walk bob: bounce up/down when the action is move
        const isMoving = tickRef.current?.action?.action === "move";
        const bob = isMoving ? Math.round(Math.sin(ts / 80) * 3.5) : 0;
        spriteFarmer(ctx, bx, by + bob);
      }
    }

    // Vignette — fades to the background colour so tile boundaries are invisible
    const BG = "6,14,26";   // matches sky gradient base (#060e1a)
    const vig = ctx.createRadialGradient(
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.08,
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.58
    );
    vig.addColorStop(0.00, `rgba(${BG},0)`);
    vig.addColorStop(0.45, `rgba(${BG},0.08)`);
    vig.addColorStop(0.70, `rgba(${BG},0.60)`);
    vig.addColorStop(0.88, `rgba(${BG},0.92)`);
    vig.addColorStop(1.00, `rgba(${BG},1)`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Minimap
    const mini = miniRef.current;
    if (mini) renderMinimap(mini.getContext("2d"), gridState, farmer);
  }

  // Action label
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
