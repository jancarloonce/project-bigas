from bigas.constants import SHED_SEEDS_PER_CYCLE, SHED_POSITION


class Shed:
    def __init__(self):
        self.x, self.y = SHED_POSITION
        self.seeds_available = SHED_SEEDS_PER_CYCLE

    def restock(self):
        self.seeds_available = SHED_SEEDS_PER_CYCLE

    def take_seeds(self, n):
        """Take up to n seeds. Returns actual amount taken."""
        amount = min(n, self.seeds_available)
        self.seeds_available -= amount
        return amount

    def to_dict(self):
        return {"seeds_available": self.seeds_available}
