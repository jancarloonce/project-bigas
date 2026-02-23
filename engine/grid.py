import random
from bigas.constants import (
    GRID_WIDTH, GRID_HEIGHT, NUM_ROCKS,
    SHED_POSITION, FARMER_SPAWN,
    CELL_EMPTY, CELL_SHED, CELL_ROCK,
    CELL_PLANTED, CELL_GROWING, CELL_RIPE,
)

SOIL_TYPES = ["good", "great", "best"]
PROTECTED = {SHED_POSITION, FARMER_SPAWN}


class GridCell:
    __slots__ = ("x", "y", "type", "soil", "growth_ticks")

    def __init__(self, x, y, cell_type, soil=None, growth_ticks=0):
        self.x = x
        self.y = y
        self.type = cell_type
        self.soil = soil
        self.growth_ticks = growth_ticks

    def to_dict(self):
        return {
            "x": self.x,
            "y": self.y,
            "type": self.type,
            "soil": self.soil,
            "growth_ticks": self.growth_ticks,
        }


class Grid:
    def __init__(self, seed=None):
        rng = random.Random(seed)
        self._cells = [[None] * GRID_WIDTH for _ in range(GRID_HEIGHT)]

        # Place shed
        sx, sy = SHED_POSITION
        self._cells[sy][sx] = GridCell(sx, sy, CELL_SHED, soil=None)

        # Place rocks (not on protected cells)
        available = [
            (x, y)
            for y in range(GRID_HEIGHT)
            for x in range(GRID_WIDTH)
            if (x, y) not in PROTECTED
        ]
        rock_positions = set(map(tuple, rng.sample(available, NUM_ROCKS)))

        # Fill all other cells with empty + random soil
        for y in range(GRID_HEIGHT):
            for x in range(GRID_WIDTH):
                if self._cells[y][x] is not None:
                    continue
                if (x, y) in rock_positions:
                    self._cells[y][x] = GridCell(x, y, CELL_ROCK, soil=None)
                else:
                    soil = rng.choice(SOIL_TYPES)
                    self._cells[y][x] = GridCell(x, y, CELL_EMPTY, soil=soil)

    def get(self, x, y) -> GridCell:
        return self._cells[y][x]

    def reset_cycle(self):
        """Reset all planted/growing/ripe cells to empty. Called at cycle start.
        Returns a list of cell dicts for all cells that changed, so the bot SDK
        can sync its FarmMap."""
        changed = []
        for y in range(GRID_HEIGHT):
            for x in range(GRID_WIDTH):
                cell = self._cells[y][x]
                if cell.type in (CELL_PLANTED, CELL_GROWING, CELL_RIPE):
                    cell.type = CELL_EMPTY
                    cell.growth_ticks = 0
                    changed.append(cell.to_dict())
        return changed

    def tick_growth(self):
        """
        Advance growth ticks for all planted/growing cells.
        Returns list of cell dicts that changed state.
        """
        changed = []
        for y in range(GRID_HEIGHT):
            for x in range(GRID_WIDTH):
                cell = self._cells[y][x]
                if cell.type in (CELL_PLANTED, CELL_GROWING):
                    cell.growth_ticks += 1
                    if cell.growth_ticks >= 5:
                        cell.type = CELL_RIPE
                    elif cell.growth_ticks >= 1:
                        cell.type = CELL_GROWING
                    changed.append(cell.to_dict())
        return changed

    def all_cells_as_dicts(self):
        """Serialize the full grid for the init message."""
        result = []
        for y in range(GRID_HEIGHT):
            for x in range(GRID_WIDTH):
                result.append(self._cells[y][x].to_dict())
        return result

    def is_in_bounds(self, x, y):
        return 0 <= x < GRID_WIDTH and 0 <= y < GRID_HEIGHT

    def is_passable(self, x, y):
        if not self.is_in_bounds(x, y):
            return False
        # Farmers can walk through crops; only rocks block movement
        return self._cells[y][x].type not in (CELL_ROCK,)
