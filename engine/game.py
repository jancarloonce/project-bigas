import json
from bigas.constants import CYCLES_PER_RUN, AP_PER_CYCLE
from engine.grid import Grid
from engine.farmer import Farmer
from engine.shed import Shed


class GameEngine:
    """
    Core game engine.
    Orchestrates cycles and ticks, communicates with the bot subprocess
    via send/receive callables, and records a full replay.
    """

    def __init__(self, send_fn, recv_fn, grid_seed=None):
        """
        send_fn(msg_str): write a line to bot stdin
        recv_fn() -> str: read a line from bot stdout (may return None on timeout/error)
        """
        self._send = send_fn
        self._recv = recv_fn
        self.grid = Grid(seed=grid_seed)
        self.farmer = Farmer()
        self.shed = Shed()
        self.bot_name = "UnknownBot"
        self.replay = {
            "bot_name": "",
            "final_score": 0.0,
            "cycle_scores": [],
            "initial_grid": {
                "width": 64,
                "height": 64,
                "cells": [],
            },
            "cycles": [],
        }

    def run(self):
        """Execute the full game (init + 5 cycles). Returns the replay dict."""
        self._send_init()
        self.bot_name = self._recv() or "UnknownBot"
        self.bot_name = self.bot_name.strip()[:64]
        self.replay["bot_name"] = self.bot_name
        self.replay["initial_grid"]["cells"] = self.grid.all_cells_as_dicts()

        cycle_scores = []
        for cycle_num in range(1, CYCLES_PER_RUN + 1):
            score = self._run_cycle(cycle_num)
            cycle_scores.append(score)

        self._send(json.dumps({"type": "end"}))
        self.replay["cycle_scores"] = cycle_scores
        self.replay["final_score"] = sum(cycle_scores) / len(cycle_scores)
        return self.replay

    # ------------------------------------------------------------------

    def _send_init(self):
        msg = {
            "type": "init",
            "grid": {
                "width": 64,
                "height": 64,
                "cells": self.grid.all_cells_as_dicts(),
            },
        }
        self._send(json.dumps(msg))

    def _run_cycle(self, cycle_num):
        # reset_cycle returns every cell that changed (planted→empty etc.)
        # so the bot SDK can sync its FarmMap on the very first tick.
        reset_changes = self.grid.reset_cycle()
        self.farmer.reset()
        self.shed.restock()

        ap = AP_PER_CYCLE
        score_this_cycle = 0
        ticks = []
        # Seed pending changes with the cycle-reset diffs so the bot sees a
        # clean slate on the first tick of every cycle.
        pending_cell_changes = reset_changes

        while ap > 0:
            # 1. Apply passive growth
            growth_changes = self.grid.tick_growth()

            # 2. Build and send tick state.
            #    Include both this tick's growth changes AND the previous tick's
            #    action changes so the SDK's local FarmMap stays accurate.
            tick_msg = {
                "type": "tick",
                "cycle": cycle_num,
                "ap_remaining": ap,
                "farmer": self.farmer.to_dict(),
                "shed": self.shed.to_dict(),
                "score_this_cycle": score_this_cycle,
                "cell_changes": pending_cell_changes + growth_changes,
            }
            self._send(json.dumps(tick_msg))

            # 3. Receive action from bot
            raw = self._recv()
            action = {}
            if raw:
                try:
                    action = json.loads(raw.strip())
                except (json.JSONDecodeError, ValueError):
                    action = {"action": "wait"}

            # 4. Apply action
            ap_cost, action_changes, score_delta = self.farmer.apply_action(
                action, self.grid, self.shed
            )
            score_this_cycle += score_delta
            ap -= max(1, ap_cost)  # always cost at least 1 AP

            # 5. Carry action cell changes into next tick's message
            pending_cell_changes = action_changes

            # 6. Record tick in replay (growth + action changes combined)
            ticks.append({
                "tick": AP_PER_CYCLE - ap,
                "ap_remaining": ap,
                "farmer": self.farmer.to_dict(),
                "action": action,
                "cell_changes": growth_changes + action_changes,
                "score_this_cycle": score_this_cycle,
            })

        self.replay["cycles"].append({
            "cycle": cycle_num,
            "score": score_this_cycle,
            "ticks": ticks,
        })
        return score_this_cycle
