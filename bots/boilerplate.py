#!/usr/bin/env python3
# Python 3.11
# Welcome to Bigas!
# This is the starter template for your farming bot.
#
# Allowed imports: bigas, math, random, logging, json, collections, heapq
import bigas
from bigas import constants
from bigas.actions import Action
import logging

"""
============================================================
AVAILABLE ACTIONS  (return one per tick via game.end_turn)
============================================================

Action.move(dx, dy)
    Move farmer one square in direction (dx, dy).
    dx and dy must each be -1, 0, or 1 (8 directions).
    Cost: 1 AP.
    Cannot move to: rocks, planted, growing, ripe cells, out of bounds.

Action.get_seeds(n)
    Get n seeds from shed. Shed must be adjacent to farmer.
    Cost: 1 AP per seed.
    Max inventory is 10 items total (seeds + rice).

Action.plant(dx, dy)
    Plant a seed on the adjacent cell at offset (dx, dy).
    Cost: 1 AP. Cell must be empty. Farmer must have seeds.
    Seed becomes ripe after 5 AP ticks (passive growth).

Action.harvest(dx, dy)
    Harvest ripe rice on the adjacent cell at offset (dx, dy).
    Cost: 1 AP. Cell must be ripe.
    Rice yield depends on soil: good=250g, great=500g, best=1000g.

Action.deposit()
    Deposit all rice in inventory at shed.
    Shed must be adjacent to farmer.
    Cost: 1 AP per rice item.
    Only deposited rice counts toward your score!

Action.WAIT
    Do nothing this tick. Cost: 1 AP.

============================================================
USEFUL CONSTANTS
============================================================

constants.GRID_WIDTH            # 64
constants.GRID_HEIGHT           # 64
constants.AP_PER_CYCLE          # 100
constants.MAX_CARRY             # 10
constants.SHED_SEEDS_PER_CYCLE  # 50
constants.SEED_GROWTH_TICKS     # 5
constants.SHED_POSITION         # (0, 0)
constants.FARMER_SPAWN          # (1, 0)
constants.SOIL_YIELD            # {"good": 250, "great": 500, "best": 1000}

============================================================
GAME STATE  (available after game.update_cycle())
============================================================

game.cycle_number               # Current cycle (1 to 5)
game.ap_remaining               # AP left this cycle

game.farmer.x                   # Farmer x position
game.farmer.y                   # Farmer y position
game.farmer.position            # (x, y) tuple
game.farmer.seeds               # Seeds in inventory
game.farmer.rice                # Rice items in inventory
game.farmer.rice_grams          # Total grams of rice in inventory
game.farmer.inventory_count     # Total items (seeds + rice)
game.farmer.is_full             # True if carrying 10 items
game.farmer.is_adjacent_to(x, y)  # True if (x,y) is adjacent to farmer

game.shed.seeds_available       # Seeds left in shed this cycle

game.farm_map.get(x, y)         # Get Cell at (x, y)
game.farm_map[(x, y)]           # Same as above
game.farm_map.adjacent_cells(x, y)  # List of adjacent Cell objects

============================================================
CELL PROPERTIES
============================================================

cell.x, cell.y                  # Position
cell.type                       # "empty","shed","rock","planted","growing","ripe"
cell.soil                       # "good", "great", "best", or None
cell.growth_ticks               # AP ticks elapsed since planted
cell.is_empty                   # True if type is empty
cell.is_ripe                    # True if ready to harvest
cell.is_passable                # True if farmer can move here
cell.rice_yield                 # Grams this cell yields on harvest
"""

# Initialize game
game = bigas.Game()
game.ready("MyFarmerBot")

logging.info("Bot started! Farmer at {}".format(game.farmer.position))

# Game loop — one iteration per AP tick
while True:
    game.update_cycle()

    farmer = game.farmer
    farm_map = game.farm_map
    shed = game.shed

    # Write your farming strategy here!

    game.end_turn(Action.WAIT)
