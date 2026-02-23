import sys
import json
from bigas.cell import Cell
from bigas.farm_map import FarmMap
from bigas.farmer import Farmer
from bigas.shed import Shed
from bigas.constants import GRID_WIDTH, GRID_HEIGHT


class Game:
    """
    Player-facing SDK Game class.
    Communicates with the engine via stdin/stdout pipes.
    """

    def __init__(self):
        self.cycle_number = 0
        self.ap_remaining = 0
        self.farmer = None
        self.farm_map = None
        self.shed = None
        self.score_this_cycle = 0
        self._player_id = "bot"
        self._cells = None  # 2D list maintained locally, patched each tick
        self._read_initial_state()

    def _readline(self):
        line = sys.stdin.readline()
        if not line:
            sys.exit(0)
        return line.strip()

    def _read_initial_state(self):
        """Read the init message from the engine (sent once at game start)."""
        raw = self._readline()
        msg = json.loads(raw)
        assert msg["type"] == "init"

        # Build the local cell grid from the initial state
        grid_data = msg["grid"]
        self._cells = [[None] * GRID_WIDTH for _ in range(GRID_HEIGHT)]
        for c in grid_data["cells"]:
            cell = Cell(c["x"], c["y"], c["type"], c.get("soil"), c.get("growth_ticks", 0))
            self._cells[c["y"]][c["x"]] = cell

        self.farm_map = FarmMap(self._cells)

    def ready(self, bot_name="MyFarmerBot"):
        """Signal to engine that bot is initialized and ready."""
        print(bot_name, flush=True)

    def update_cycle(self):
        """
        Read the next tick state from the engine.
        Patches the local FarmMap with changed cells.
        Raises SystemExit if the engine sends an 'end' message.
        """
        raw = self._readline()
        msg = json.loads(raw)

        if msg["type"] == "end":
            sys.exit(0)

        assert msg["type"] == "tick"

        self.cycle_number = msg["cycle"]
        self.ap_remaining = msg["ap_remaining"]
        self.score_this_cycle = msg.get("score_this_cycle", 0)

        f = msg["farmer"]
        self.farmer = Farmer(f["x"], f["y"])
        self.farmer.seeds = f["seeds"]
        self.farmer.rice = f["rice"]
        self.farmer.rice_grams = f["rice_grams"]

        s = msg["shed"]
        self.shed = Shed(0, 0, s["seeds_available"])

        # Apply cell diffs
        for c in msg.get("cell_changes", []):
            cell = self._cells[c["y"]][c["x"]]
            cell.type = c["type"]
            cell.growth_ticks = c.get("growth_ticks", 0)

    def end_turn(self, command):
        """Send one action to the engine and end this tick."""
        print(json.dumps(command), flush=True)

    @property
    def my_id(self):
        return self._player_id
