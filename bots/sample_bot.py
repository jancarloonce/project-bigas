#!/usr/bin/env python3
# Python 3.11
# Bigas Sample Bot — Simple Greedy Farmer
#
# Strategy:
#   1. Walk to shed, grab seeds
#   2. Walk out and plant seeds on best adjacent soil
#   3. Wander nearby while seeds grow
#   4. Harvest ripe rice
#   5. Return to shed and deposit before AP runs out

import bigas
from bigas import constants
from bigas.actions import Action
import logging

game = bigas.Game()
game.ready("GreedyFarmer")

logging.info("GreedyFarmer ready at {}".format(game.farmer.position))


def move_towards(farmer, tx, ty):
    dx = 0 if farmer.x == tx else (1 if tx > farmer.x else -1)
    dy = 0 if farmer.y == ty else (1 if ty > farmer.y else -1)
    return Action.move(dx, dy)


def best_adjacent_empty(farmer, farm_map):
    best_cell = None
    best_yield = 0
    for cell in farm_map.adjacent_cells(farmer.x, farmer.y):
        if cell.is_empty and cell.soil is not None:
            if cell.rice_yield > best_yield:
                best_cell = cell
                best_yield = cell.rice_yield
    return best_cell


def adjacent_ripe(farmer, farm_map):
    for cell in farm_map.adjacent_cells(farmer.x, farmer.y):
        if cell.is_ripe:
            return cell
    return None


while True:
    game.update_cycle()

    farmer = game.farmer
    farm_map = game.farm_map
    shed = game.shed
    ap = game.ap_remaining
    sx, sy = constants.SHED_POSITION

    if farmer.rice > 0 and farmer.is_adjacent_to(sx, sy):
        game.end_turn(Action.deposit())
        continue

    ripe = adjacent_ripe(farmer, farm_map)
    if ripe and not farmer.is_full:
        game.end_turn(Action.harvest(ripe.x - farmer.x, ripe.y - farmer.y))
        continue

    if farmer.is_full or (farmer.rice > 0 and ap < 20):
        if farmer.is_adjacent_to(sx, sy):
            game.end_turn(Action.deposit())
        else:
            game.end_turn(move_towards(farmer, sx + 1, sy))
        continue

    if farmer.seeds < 3 and farmer.is_adjacent_to(sx, sy) and shed.seeds_available > 0:
        game.end_turn(Action.get_seeds(1))
        continue

    if farmer.seeds == 0:
        if farmer.is_adjacent_to(sx, sy):
            game.end_turn(Action.get_seeds(1))
        else:
            game.end_turn(move_towards(farmer, sx + 1, sy))
        continue

    target = best_adjacent_empty(farmer, farm_map)
    if target and farmer.seeds > 0:
        game.end_turn(Action.plant(target.x - farmer.x, target.y - farmer.y))
        continue

    target_x = min(farmer.x + 3, constants.GRID_WIDTH - 2)
    game.end_turn(move_towards(farmer, target_x, 1))
