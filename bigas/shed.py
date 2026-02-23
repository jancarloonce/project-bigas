class Shed:
    def __init__(self, x, y, seeds_available):
        self.x = x
        self.y = y
        self.seeds_available = seeds_available

    def __repr__(self):
        return f"Shed(pos=({self.x},{self.y}) seeds={self.seeds_available})"
