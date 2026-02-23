import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import AdBanner from "../components/AdBanner";
import { submitBot } from "../lib/api";

const ADJECTIVES = [
  "Greedy", "Lazy", "Speedy", "Sneaky", "Mighty", "Tiny", "Golden", "Muddy",
  "Hungry", "Sleepy", "Clever", "Brave", "Rusty", "Soggy", "Dusty", "Lucky",
];
const NOUNS = [
  "Farmer", "Harvester", "Planter", "Reaper", "Scarecrow", "Ox", "Carabao",
  "Seedling", "Sprout", "Stalk", "Paddy", "Hoe", "Sickle", "Basket", "Barn",
];

function randomBotName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}${noun}`;
}

const BOILERPLATE = `#!/usr/bin/env python3
"""
reference_bot.py — Bigas Reference Bot
=======================================
Strategy overview:
  1. At cycle start, scout the area near spawn for the best soil.
  2. Walk to the shed, grab seeds.
  3. Move to the target farming zone and plant on high-yield empty cells.
  4. Harvest ripe rice immediately when adjacent.
  5. Return to shed and deposit before AP runs out.
"""

import bigas
from bigas import constants
from bigas.actions import Action

SHED_X, SHED_Y = constants.SHED_POSITION
AP_SAFE_RETURN = 18
SEED_REFILL_AT = 2
MAX_SEEDS_GRAB = 6

def step_towards(farmer, tx, ty):
    dx = 0 if farmer.x == tx else (1 if tx > farmer.x else -1)
    dy = 0 if farmer.y == ty else (1 if ty > farmer.y else -1)
    return Action.move(dx, dy)

def chebyshev(ax, ay, bx, by):
    return max(abs(ax - bx), abs(ay - by))

def adjacent_cells_of_type(farmer, farm_map, cell_type):
    return [c for c in farm_map.adjacent_cells(farmer.x, farmer.y) if c.type == cell_type]

def best_planting_target(farmer, farm_map):
    candidates = [c for c in farm_map.adjacent_cells(farmer.x, farmer.y) if c.is_empty and c.soil]
    if not candidates:
        return None
    return max(candidates, key=lambda c: (c.rice_yield, -chebyshev(c.x, c.y, SHED_X, SHED_Y)))

def find_best_farming_spot(farm_map):
    best_score, best_pos = -1, (4, 4)
    for cy in range(1, 14):
        for cx in range(1, 14):
            cell = farm_map.get(cx, cy)
            if not cell.is_passable:
                continue
            score = sum(
                farm_map.get(cx+dx, cy+dy).rice_yield
                for dy in range(-1, 2) for dx in range(-1, 2)
                if 0 <= cx+dx < constants.GRID_WIDTH and 0 <= cy+dy < constants.GRID_HEIGHT
                and farm_map.get(cx+dx, cy+dy).is_empty
            )
            if score > best_score:
                best_score, best_pos = score, (cx, cy)
    return best_pos

game = bigas.Game()
game.ready("ReferenceBot")
farm_target_x, farm_target_y = 4, 4

while True:
    game.update_cycle()
    farmer  = game.farmer
    farm_map = game.farm_map
    shed    = game.shed
    ap      = game.ap_remaining

    if ap == constants.AP_PER_CYCLE:
        farm_target_x, farm_target_y = find_best_farming_spot(farm_map)

    dist_to_shed = chebyshev(farmer.x, farmer.y, SHED_X + 1, SHED_Y)

    if farmer.rice > 0 and farmer.is_adjacent_to(SHED_X, SHED_Y):
        game.end_turn(Action.deposit()); continue

    if farmer.rice > 0 and ap <= dist_to_shed + farmer.rice + AP_SAFE_RETURN:
        game.end_turn(Action.deposit() if farmer.is_adjacent_to(SHED_X, SHED_Y) else step_towards(farmer, SHED_X + 1, SHED_Y)); continue

    ripe_cells = adjacent_cells_of_type(farmer, farm_map, "ripe")
    if ripe_cells and not farmer.is_full:
        best_ripe = max(ripe_cells, key=lambda c: c.rice_yield)
        game.end_turn(Action.harvest(best_ripe.x - farmer.x, best_ripe.y - farmer.y)); continue

    if farmer.is_full:
        game.end_turn(Action.deposit() if farmer.is_adjacent_to(SHED_X, SHED_Y) else step_towards(farmer, SHED_X + 1, SHED_Y)); continue

    if farmer.seeds <= SEED_REFILL_AT and farmer.is_adjacent_to(SHED_X, SHED_Y) and shed.seeds_available > 0:
        grab = min(MAX_SEEDS_GRAB, constants.MAX_CARRY - farmer.inventory_count, shed.seeds_available)
        if grab > 0:
            game.end_turn(Action.get_seeds(grab)); continue

    if farmer.seeds == 0 and shed.seeds_available > 0:
        if farmer.is_adjacent_to(SHED_X, SHED_Y):
            game.end_turn(Action.get_seeds(min(MAX_SEEDS_GRAB, constants.MAX_CARRY - farmer.inventory_count, shed.seeds_available)))
        else:
            game.end_turn(step_towards(farmer, SHED_X + 1, SHED_Y))
        continue

    if farmer.seeds > 0:
        target = best_planting_target(farmer, farm_map)
        if target:
            game.end_turn(Action.plant(target.x - farmer.x, target.y - farmer.y)); continue

    if chebyshev(farmer.x, farmer.y, farm_target_x, farm_target_y) > 1:
        game.end_turn(step_towards(farmer, farm_target_x, farm_target_y)); continue

    for radius in range(1, 8):
        best_cell = max(
            (farm_map.get(farmer.x+dx, farmer.y+dy)
             for dy in range(-radius, radius+1) for dx in range(-radius, radius+1)
             if (abs(dx)==radius or abs(dy)==radius)
             and 0 <= farmer.x+dx < constants.GRID_WIDTH
             and 0 <= farmer.y+dy < constants.GRID_HEIGHT
             and farm_map.get(farmer.x+dx, farmer.y+dy).is_empty),
            key=lambda c: c.rice_yield, default=None
        )
        if best_cell:
            game.end_turn(step_towards(farmer, best_cell.x, best_cell.y)); break
    else:
        game.end_turn(Action.WAIT)
`;

export default function SubmitPage() {
  const navigate = useNavigate();
  const [botName, setBotName] = useState(randomBotName);
  const [tab, setTab] = useState("editor"); // "editor" | "upload"
  const [code, setCode] = useState(BOILERPLATE);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!botName.trim()) {
      setError("Please enter a bot name.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { job_id } = await submitBot({
        botName: botName.trim(),
        code: tab === "editor" ? code : null,
        file: tab === "upload" ? file : null,
      });
      navigate(`/result/${job_id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top ad banner */}
      <AdBanner slot="1111111111" format="horizontal" className="w-full min-h-[90px]" />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content */}
        <div className="flex-1 space-y-4">
          {/* Header */}
          <div>
            <h1 className="font-pixel text-base text-paddy-light leading-loose">
              SUBMIT YOUR BOT
            </h1>
            <p className="text-parchment/70 text-sm mt-2">
              Write a Python script that controls your farmer. Your bot gets{" "}
              <span className="text-grain">100 AP</span> per cycle across{" "}
              <span className="text-grain">5 cycles</span>. Maximize your average rice yield.
            </p>
          </div>

          {/* Bot name */}
          <div>
            <label className="font-pixel text-xs text-grain block mb-2">BOT NAME</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="e.g. GreedyFarmer"
                maxLength={64}
                className="pixel-input flex-1"
              />
              <button
                type="button"
                onClick={() => setBotName(randomBotName())}
                className="btn-secondary px-3 py-2 text-xs shrink-0"
                title="Generate random name"
              >
                ↺
              </button>
            </div>
          </div>

          {/* Tab toggle */}
          <div className="flex gap-0">
            <button
              type="button"
              onClick={() => setTab("editor")}
              className={`font-pixel text-xs px-4 py-2 border-2 border-r-0 transition-colors ${
                tab === "editor"
                  ? "bg-paddy border-paddy-light text-soil-dark"
                  : "bg-soil border-rock text-parchment hover:border-paddy"
              }`}
            >
              WRITE CODE
            </button>
            <button
              type="button"
              onClick={() => setTab("upload")}
              className={`font-pixel text-xs px-4 py-2 border-2 transition-colors ${
                tab === "upload"
                  ? "bg-paddy border-paddy-light text-soil-dark"
                  : "bg-soil border-rock text-parchment hover:border-paddy"
              }`}
            >
              UPLOAD .PY
            </button>
          </div>

          {/* Editor or upload */}
          {tab === "editor" ? (
            <div className="border-2 border-rock overflow-hidden" style={{ height: 420 }}>
              <Editor
                height="420px"
                defaultLanguage="python"
                value={code}
                onChange={(val) => setCode(val ?? "")}
                theme="vs-dark"
                options={{
                  fontSize: 13,
                  fontFamily: '"Courier New", Courier, monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: "on",
                  wordWrap: "on",
                }}
              />
            </div>
          ) : (
            <div
              className="card border-dashed flex flex-col items-center justify-center cursor-pointer min-h-[200px] hover:border-paddy transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".py"
                className="hidden"
                onChange={(e) => setFile(e.target.files[0] || null)}
              />
              {file ? (
                <div className="text-center space-y-2">
                  <div className="font-pixel text-xs text-paddy-light">{file.name}</div>
                  <div className="text-parchment/50 text-xs">
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                  <button
                    type="button"
                    className="btn-secondary text-xs py-1 px-3 mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    REMOVE
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <div className="font-pixel text-xs text-rock">CLICK TO UPLOAD</div>
                  <div className="text-parchment/50 text-xs">.py files only — max 64 KB</div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="border-2 border-red-700 bg-red-900/30 text-red-300 font-pixel text-xs p-3">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary w-full text-sm"
          >
            {loading ? "SUBMITTING..." : "RUN BOT"}
          </button>
        </div>

        {/* Sidebar ad */}
        <div className="hidden lg:block w-[300px] shrink-0 space-y-4">
          <AdBanner slot="2222222222" format="rectangle" className="w-[300px] min-h-[250px]" />

          {/* Quick reference */}
          <div className="card space-y-2">
            <h2 className="font-pixel text-xs text-grain">QUICK REF</h2>
            <div className="text-xs text-parchment/70 space-y-1 font-mono">
              <div><span className="text-paddy-light">move(dx, dy)</span> — 1 AP</div>
              <div><span className="text-paddy-light">get_seeds(n)</span> — n AP</div>
              <div><span className="text-paddy-light">plant(dx, dy)</span> — 1 AP</div>
              <div><span className="text-paddy-light">harvest(dx, dy)</span> — 1 AP</div>
              <div><span className="text-paddy-light">deposit()</span> — 1 AP/rice</div>
            </div>
            <hr className="border-rock" />
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-rock">good soil</span>
                <span className="text-parchment">250 g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-grain">great soil</span>
                <span className="text-parchment">500 g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ripe">best soil</span>
                <span className="text-parchment">1000 g</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
