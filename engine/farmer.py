from bigas.constants import (
    MAX_CARRY, FARMER_SPAWN, SHED_POSITION,
    CELL_EMPTY, CELL_SHED, CELL_PLANTED, CELL_RIPE,
    SOIL_YIELD,
)


class Farmer:
    def __init__(self):
        self.x, self.y = FARMER_SPAWN
        self.seeds = 0
        self.rice = 0
        self.rice_grams = 0

    def reset(self):
        self.x, self.y = FARMER_SPAWN
        self.seeds = 0
        self.rice = 0
        self.rice_grams = 0

    @property
    def inventory_count(self):
        return self.seeds + self.rice

    @property
    def is_full(self):
        return self.inventory_count >= MAX_CARRY

    def is_adjacent_to(self, x, y):
        return abs(self.x - x) <= 1 and abs(self.y - y) <= 1 and (self.x, self.y) != (x, y)

    def to_dict(self):
        return {
            "x": self.x,
            "y": self.y,
            "seeds": self.seeds,
            "rice": self.rice,
            "rice_grams": self.rice_grams,
        }

    def apply_action(self, action, grid, shed):
        """
        Apply one action against the current grid/shed state.
        Returns (ap_cost, cell_changes, score_delta).
        Invalid or no-op actions cost 1 AP (treated as wait).
        """
        name = action.get("action", "wait")

        if name == "wait":
            return 1, [], 0

        if name == "move":
            return self._do_move(action, grid)

        if name == "get_seeds":
            return self._do_get_seeds(action, shed)

        if name == "plant":
            return self._do_plant(action, grid)

        if name == "harvest":
            return self._do_harvest(action, grid)

        if name == "deposit":
            return self._do_deposit(shed)

        # Unknown action — treat as wait
        return 1, [], 0

    # ------------------------------------------------------------------
    def _do_move(self, action, grid):
        dx = action.get("dx", 0)
        dy = action.get("dy", 0)
        if dx not in (-1, 0, 1) or dy not in (-1, 0, 1) or (dx == 0 and dy == 0):
            return 1, [], 0
        nx, ny = self.x + dx, self.y + dy
        if not grid.is_in_bounds(nx, ny) or not grid.is_passable(nx, ny):
            return 1, [], 0
        self.x, self.y = nx, ny
        return 1, [], 0

    def _do_get_seeds(self, action, shed):
        if not self.is_adjacent_to(shed.x, shed.y):
            return 1, [], 0
        n = max(1, int(action.get("n", 1)))
        space = MAX_CARRY - self.inventory_count
        if space <= 0:
            return 1, [], 0
        can_take = min(n, space)
        taken = shed.take_seeds(can_take)
        self.seeds += taken
        return taken, [], 0  # costs 1 AP per seed

    def _do_plant(self, action, grid):
        dx = action.get("dx", 0)
        dy = action.get("dy", 0)
        tx, ty = self.x + dx, self.y + dy
        if not self.is_adjacent_to(tx, ty):
            return 1, [], 0
        if self.seeds <= 0:
            return 1, [], 0
        if not grid.is_in_bounds(tx, ty):
            return 1, [], 0
        cell = grid.get(tx, ty)
        if cell.type != CELL_EMPTY:
            return 1, [], 0
        cell.type = CELL_PLANTED
        cell.growth_ticks = 0
        self.seeds -= 1
        return 1, [cell.to_dict()], 0

    def _do_harvest(self, action, grid):
        dx = action.get("dx", 0)
        dy = action.get("dy", 0)
        tx, ty = self.x + dx, self.y + dy
        if not self.is_adjacent_to(tx, ty):
            return 1, [], 0
        if self.is_full:
            return 1, [], 0
        if not grid.is_in_bounds(tx, ty):
            return 1, [], 0
        cell = grid.get(tx, ty)
        if cell.type != CELL_RIPE:
            return 1, [], 0
        yield_g = SOIL_YIELD.get(cell.soil, 0)
        self.rice += 1
        self.rice_grams += yield_g
        cell.type = CELL_EMPTY
        cell.growth_ticks = 0
        return 1, [cell.to_dict()], 0

    def _do_deposit(self, shed):
        if not self.is_adjacent_to(shed.x, shed.y):
            return 1, [], 0
        if self.rice <= 0:
            return 1, [], 0
        count = self.rice
        score = self.rice_grams
        self.rice = 0
        self.rice_grams = 0
        return count, [], score  # costs 1 AP per rice item
