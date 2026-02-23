#!/usr/bin/env python3
"""
main.py — CLI entry point for running a bot locally (without Docker/web).

Usage:
    python main.py bots/sample_bot.py
    python main.py path/to/my_bot.py [--seed 42]
"""
import sys
import os
import json
import argparse
import subprocess
import threading


def main():
    parser = argparse.ArgumentParser(description="Run a Bigas bot locally.")
    parser.add_argument("bot", help="Path to the bot .py file")
    parser.add_argument("--seed", type=int, default=None, help="Random seed for the grid")
    parser.add_argument("--out", default=None, help="Write replay JSON to this file")
    args = parser.parse_args()

    if not os.path.isfile(args.bot):
        print(f"Error: bot file not found: {args.bot}", file=sys.stderr)
        sys.exit(1)

    # Import engine here so the script works from the project root
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from engine.game import GameEngine

    # Spawn the bot as a subprocess
    proc = subprocess.Popen(
        [sys.executable, args.bot],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=sys.stderr,
        text=True,
        bufsize=1,
    )

    BOT_TIMEOUT = 0.2

    def send_fn(msg):
        try:
            proc.stdin.write(msg + "\n")
            proc.stdin.flush()
        except BrokenPipeError:
            pass

    def recv_fn():
        result = [None]

        def _read():
            try:
                result[0] = proc.stdout.readline()
            except Exception:
                result[0] = None

        t = threading.Thread(target=_read, daemon=True)
        t.start()
        t.join(timeout=BOT_TIMEOUT)
        return result[0]

    engine = GameEngine(send_fn=send_fn, recv_fn=recv_fn, grid_seed=args.seed)

    try:
        replay = engine.run()
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=2)
        except Exception:
            proc.kill()

    print(f"\nBot: {replay['bot_name']}")
    print(f"Cycle scores: {replay['cycle_scores']}")
    print(f"Final average score: {replay['final_score']:.1f} grams")

    if args.out:
        with open(args.out, "w") as f:
            json.dump(replay, f, indent=2)
        print(f"Replay saved to {args.out}")


if __name__ == "__main__":
    main()
