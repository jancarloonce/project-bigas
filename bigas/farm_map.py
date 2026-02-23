class FarmMap:
    def __init__(self, cells):
        # cells is a 2D list: self._grid[y][x]
        self._grid = cells

    def __getitem__(self, position):
        """Get cell by (x, y) tuple: farm_map[(x, y)]"""
        x, y = position
        return self._grid[y][x]

    def get(self, x, y):
        """Get cell by x, y coordinates."""
        return self._grid[y][x]

    def adjacent_cells(self, x, y):
        """Returns list of valid adjacent Cell objects around (x, y)."""
        from bigas.constants import GRID_WIDTH, GRID_HEIGHT
        cells = []
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                if dx == 0 and dy == 0:
                    continue
                nx, ny = x + dx, y + dy
                if 0 <= nx < GRID_WIDTH and 0 <= ny < GRID_HEIGHT:
                    cells.append(self._grid[ny][nx])
        return cells
