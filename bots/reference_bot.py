#!/usr/bin/env python3
"""
reference_bot.py — Bigas Reference Bot
=======================================
A well-commented example bot that demonstrates a solid farming strategy.

Strategy overview:
  1. At cycle start, scout the 5x5 area near spawn for the best soil.
  2. Walk to the shed, grab as many seeds as inventory allows.
  3. Move to the target farming zone and plant on the highest-yield empty cells.
  4. While waiting for crops to ripen (5 AP ticks), plant more or move closer.
  5. Harvest ripe rice immediately when adjacent.
  6. Return to shed and deposit before AP runs out (with a safe margin).
  7. Repeat until AP is exhausted.

Key mechanics demonstrated:
  - Reading soil quality and prioritising "best" > "great" > "good"
  - Simple greedy pathfinding (diagonal moves allowed)
  - AP budget management (don't get caught far from the shed at the end)
  - Harvest-before-plant priority to keep inventory moving
  - Adaptive seed count (grab more when inventory has room)
"""

import bigas
from bigas import constants
from bigas.actions import Action
from collections import deque

# ── constants ────────────────────────────────────────────────────────────────
SHED_X, SHED_Y = constants.SHED_POSITION
SPAWN_X, SPAWN_Y = constants.FARMER_SPAWN
AP_SAFE_RETURN = 18    # return to shed if AP drops below this
SEED_REFILL_AT = 2     # go grab seeds when carrying fewer than this many
MAX_SEEDS_GRAB = 6     # seeds to pick up per trip (leave room for rice)

# ── helpers ─────────────────────────────────────────────────────────────────

def step_towards(farmer, tx, ty):
    """One diagonal step toward (tx, ty). Chebyshev distance."""
    dx = 0 if farmer.x == tx else (1 if tx > farmer.x else -1)
    dy = 0 if farmer.y == ty else (1 if ty > farmer.y else -1)
    return Action.move(dx, dy)


def manhattan(ax, ay, bx, by):
    return abs(ax - bx) + abs(ay - by)


def chebyshev(ax, ay, bx, by):
    """Steps needed with 8-directional movement."""
    return max(abs(ax - bx), abs(ay - by))


def adjacent_cells_of_type(farmer, farm_map, cell_type):
    """All adjacent cells matching a given type."""
    return [
        c for c in farm_map.adjacent_cells(farmer.x, farmer.y)
        if c.type == cell_type
    ]


def best_planting_target(farmer, farm_map):
    """
    Find the highest-yield adjacent empty cell.
    Tie-break: prefer cells closer to shed (so we don't wander too far).
    """
    candidates = [
        c for c in farm_map.adjacent_cells(farmer.x, farmer.y)
        if c.is_empty and c.soil is not None
    ]
    if not candidates:
        return None
    return max(
        candidates,
        key=lambda c: (c.rice_yield, -chebyshev(c.x, c.y, SHED_X, SHED_Y))
    )


def find_best_farming_spot(farm_map, farmer):
    """
    BFS outward from spawn to find a cluster of high-yield empty cells.
    Returns the centre of the best 3x3 patch within ~12 steps of spawn.
    Falls back to (4, 4) if nothing stands out.
    """
    best_score = -1
    best_pos = (4, 4)

    for cy in range(1, 14):
        for cx in range(1, 14):
            if not (0 <= cx < constants.GRID_WIDTH and 0 <= cy < constants.GRID_HEIGHT):
                continue
            cell = farm_map.get(cx, cy)
            if not cell.is_passable:
                continue
            # Score = sum of rice_yield for the 3x3 neighbourhood
            score = 0
            for dy in range(-1, 2):
                for dx in range(-1, 2):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < constants.GRID_WIDTH and 0 <= ny < constants.GRID_HEIGHT:
                        nc = farm_map.get(nx, ny)
                        if nc.is_empty and nc.soil:
                            score += nc.rice_yield
            if score > best_score:
                best_score = score
                best_pos = (cx, cy)

    return best_pos


# ── main ─────────────────────────────────────────────────────────────────────

game = bigas.Game()
game.ready("ReferenceBot")

# Scouted farming target — computed once per cycle from the initial grid state
farm_target_x, farm_target_y = 4, 4

while True:
    game.update_cycle()

    farmer  = game.farmer
    farm_map = game.farm_map
    shed    = game.shed
    ap      = game.ap_remaining
    cycle   = game.cycle_number

    # Re-scout at the start of each cycle (tick 1 = first tick, ap = 100)
    if ap == constants.AP_PER_CYCLE:
        farm_target_x, farm_target_y = find_best_farming_spot(farm_map, farmer)

    dist_to_shed = chebyshev(farmer.x, farmer.y, SHED_X + 1, SHED_Y)

    # ── PRIORITY 1: deposit rice if next to shed and carrying any ────────────
    if farmer.rice > 0 and farmer.is_adjacent_to(SHED_X, SHED_Y):
        game.end_turn(Action.deposit())
        continue

    # ── PRIORITY 2: emergency return — not enough AP to farm and get back ────
    if farmer.rice > 0 and ap <= dist_to_shed + farmer.rice + AP_SAFE_RETURN:
        if farmer.is_adjacent_to(SHED_X, SHED_Y):
            game.end_turn(Action.deposit())
        else:
            game.end_turn(step_towards(farmer, SHED_X + 1, SHED_Y))
        continue

    # ── PRIORITY 3: harvest any ripe cell next to us ──────────────────────────
    ripe_cells = adjacent_cells_of_type(farmer, farm_map, "ripe")
    if ripe_cells and not farmer.is_full:
        best_ripe = max(ripe_cells, key=lambda c: c.rice_yield)
        game.end_turn(Action.harvest(best_ripe.x - farmer.x, best_ripe.y - farmer.y))
        continue

    # ── PRIORITY 4: deposit if inventory is full ──────────────────────────────
    if farmer.is_full:
        if farmer.is_adjacent_to(SHED_X, SHED_Y):
            game.end_turn(Action.deposit())
        else:
            game.end_turn(step_towards(farmer, SHED_X + 1, SHED_Y))
        continue

    # ── PRIORITY 5: get seeds if running low and adjacent to shed ─────────────
    if farmer.seeds <= SEED_REFILL_AT and farmer.is_adjacent_to(SHED_X, SHED_Y):
        if shed.seeds_available > 0:
            can_carry = constants.MAX_CARRY - farmer.inventory_count
            grab = min(MAX_SEEDS_GRAB, can_carry, shed.seeds_available)
            if grab > 0:
                game.end_turn(Action.get_seeds(grab))
                continue

    # ── PRIORITY 6: go to shed if we have no seeds ────────────────────────────
    if farmer.seeds == 0 and shed.seeds_available > 0:
        if farmer.is_adjacent_to(SHED_X, SHED_Y):
            can_carry = constants.MAX_CARRY - farmer.inventory_count
            grab = min(MAX_SEEDS_GRAB, can_carry, shed.seeds_available)
            game.end_turn(Action.get_seeds(grab))
        else:
            game.end_turn(step_towards(farmer, SHED_X + 1, SHED_Y))
        continue

    # ── PRIORITY 7: plant on the best adjacent empty cell ─────────────────────
    if farmer.seeds > 0:
        target = best_planting_target(farmer, farm_map)
        if target:
            game.end_turn(Action.plant(target.x - farmer.x, target.y - farmer.y))
            continue

    # ── PRIORITY 8: move toward farming zone ──────────────────────────────────
    if chebyshev(farmer.x, farmer.y, farm_target_x, farm_target_y) > 1:
        game.end_turn(step_towards(farmer, farm_target_x, farm_target_y))
        continue

    # ── PRIORITY 9: spiral outward from farming zone looking for empty cells ──
    # Search in expanding rings for the nearest plantable cell
    found_move = False
    for radius in range(1, 8):
        best_cell = None
        best_yield = -1
        for dy in range(-radius, radius + 1):
            for dx in range(-radius, radius + 1):
                if abs(dx) != radius and abs(dy) != radius:
                    continue  # only check the ring perimeter
                nx, ny = farmer.x + dx, farmer.y + dy
                if not (0 <= nx < constants.GRID_WIDTH and 0 <= ny < constants.GRID_HEIGHT):
                    continue
                nc = farm_map.get(nx, ny)
                if nc.is_empty and nc.soil and nc.rice_yield > best_yield:
                    best_yield = nc.rice_yield
                    best_cell = nc
        if best_cell:
            game.end_turn(step_towards(farmer, best_cell.x, best_cell.y))
            found_move = True
            break

    if found_move:
        continue

    # ── FALLBACK: wait ────────────────────────────────────────────────────────
    game.end_turn(Action.WAIT)
