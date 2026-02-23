class Farmer:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.seeds = 0
        self.rice = 0
        self.rice_grams = 0

    @property
    def position(self):
        return (self.x, self.y)

    @property
    def inventory_count(self):
        return self.seeds + self.rice

    @property
    def is_full(self):
        from bigas.constants import MAX_CARRY
        return self.inventory_count >= MAX_CARRY

    def is_adjacent_to(self, x, y):
        """Returns True if (x, y) is adjacent to farmer (within 1 step, not same cell)."""
        return abs(self.x - x) <= 1 and abs(self.y - y) <= 1 and (self.x, self.y) != (x, y)

    def __repr__(self):
        return f"Farmer(pos=({self.x},{self.y}) seeds={self.seeds} rice={self.rice})"
