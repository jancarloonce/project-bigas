class Cell:
    def __init__(self, x, y, cell_type, soil, growth_ticks=0):
        self.x = x
        self.y = y
        self.type = cell_type
        self.soil = soil
        self.growth_ticks = growth_ticks

    @property
    def is_empty(self):
        return self.type == "empty"

    @property
    def is_rock(self):
        return self.type == "rock"

    @property
    def is_shed(self):
        return self.type == "shed"

    @property
    def is_ripe(self):
        return self.type == "ripe"

    @property
    def is_passable(self):
        # Farmers can walk through crops; only rocks block movement
        return self.type != "rock"

    @property
    def rice_yield(self):
        from bigas.constants import SOIL_YIELD
        return SOIL_YIELD.get(self.soil, 0) if self.soil else 0

    def __repr__(self):
        return f"Cell({self.x},{self.y} type={self.type} soil={self.soil})"
