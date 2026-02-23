class Action:
    WAIT = {"action": "wait"}

    @staticmethod
    def move(dx, dy):
        """Move farmer by (dx, dy). dx/dy must be -1, 0, or 1."""
        return {"action": "move", "dx": dx, "dy": dy}

    @staticmethod
    def get_seeds(n=1):
        """Get n seeds from shed. Shed must be adjacent. Cost: 1 AP per seed."""
        return {"action": "get_seeds", "n": n}

    @staticmethod
    def plant(dx, dy):
        """Plant seed on adjacent cell at offset (dx, dy). Cost: 1 AP."""
        return {"action": "plant", "dx": dx, "dy": dy}

    @staticmethod
    def harvest(dx, dy):
        """Harvest ripe rice on adjacent cell at offset (dx, dy). Cost: 1 AP."""
        return {"action": "harvest", "dx": dx, "dy": dy}

    @staticmethod
    def deposit():
        """Deposit all rice at shed. Shed must be adjacent. Cost: 1 AP per rice item."""
        return {"action": "deposit"}
