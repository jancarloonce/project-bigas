/**
 * Sprite asset configuration for the farm visualizer.
 *
 * HOW TO USE
 * ----------
 * 1. Drop your PNG files into:  frontend/public/assets/sprites/
 * 2. Set `src` below to the public-relative path, e.g. "/assets/sprites/farmer.png"
 * 3. Adjust (ox, oy, w, h) to position/size the image over the tile.
 * 4. Leave `src: null` to keep the built-in procedural pixel art for that element.
 *
 * ANCHOR POINT
 * ------------
 * Every sprite is positioned relative to (bx, by) — the top-tip of the tile's
 * top face (the highest pixel of the isometric diamond).
 *
 *   ctx.drawImage(img, bx + ox, by + oy, w, h)
 *
 * CLIP (optional source crop)
 * ----------------------------
 * Add  clip: { x, y, w, h }  to draw only a sub-region of the source image.
 * Useful for Kenney tiles where the bottom ~25% is the tile base (ground).
 * Without clip the full image is drawn.
 *
 * KENNEY ISOMETRIC TILE MATHS
 * ----------------------------
 * Kenney's Isometric Miniature Farm tiles are 256×512 px.
 * Tile base occupies  y = 384–512  (the bottom 128 px = the diamond).
 * Scaling to our 44px-wide tile: factor = 44/256 = 0.172
 *   full scaled size:   44 × 88  (256×512 × 0.172)
 *   tile base at:       scaled y 66–88  →  our (bx, by) to (bx, by+22)
 *   crop-only region:   y 0–384 in source  →  dst 44×66, placed at (bx-22, by-66)
 * So  ox=-22, oy=-66, w=44, h=66,  clip={x:0, y:0, w:256, h:384}
 * draws just the crop/object above the tile surface.
 *
 * RECOMMENDED ASSET SOURCES (free, no attribution required)
 * ----------------------------------------------------------
 *  https://kenney.nl/assets/isometric-miniature-farm  (CC0)
 *  https://opengameart.org/content/isometric-crops-and-farmland  (CC-BY)
 */

export const SPRITES = {
  // ── character ─────────────────────────────────────────────────────────────
  // No free farmer sprite bundled yet — keep procedural until you add one.
  farmer: {
    src: null,            // e.g. "/assets/sprites/farmer.png"
    ox: -16, oy: -42,
    w:   32, h:   44,
  },

  // ── structures ────────────────────────────────────────────────────────────
  // Kenney roofSingle_S — draws just the roof cap above our red iso block.
  shed: {
    src: "/assets/sprites/kenney/roofSingle_S.png",
    clip: { x: 0, y: 0, w: 256, h: 384 },   // above-tile portion only
    ox: -44, oy: -132,
    w:   88, h:  132,
  },

  // ── rock overlay ──────────────────────────────────────────────────────────
  rock: {
    src: null,            // e.g. "/assets/sprites/rock_top.png"
    ox: -22, oy:   0,
    w:   44, h:   22,
  },

  // ── crops (Kenney Isometric Miniature Farm, CC0) ──────────────────────────
  // Each Kenney tile is 256×512. We clip off the tile base (bottom 128 px)
  // and draw only the crop portion above our own iso block.

  planted: {
    src: null,            // No good single-seedling Kenney tile — keep procedural
    ox: -12, oy: -12,
    w:   24, h:   12,
  },

  growing: {
    src: "/assets/sprites/kenney/cornYoung_S.png",
    clip: { x: 0, y: 0, w: 256, h: 384 },
    ox: -44, oy: -132,
    w:   88, h:  132,
  },

  ripe: {
    src: "/assets/sprites/kenney/corn_S.png",
    clip: { x: 0, y: 0, w: 256, h: 384 },
    ox: -44, oy: -132,
    w:   88, h:  132,
  },
};
