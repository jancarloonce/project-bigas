"""
engine/runner.py

Entrypoint executed inside the Docker container.

Bot code is passed via the BIGAS_BOT_CODE environment variable (base64-encoded).
This avoids Docker volume mount issues when the API runs inside a container.

Fallback: if BIGAS_BOT_CODE is not set, reads the bot path from sys.argv[1]
(used by main.py CLI runner on the host).
"""
import sys
import os
import json
import base64
import subprocess
import threading
import tempfile

sys.path.insert(0, "/app")

from engine.game import GameEngine

BOT_TICK_TIMEOUT = 0.15


def main():
    bot_script = None
    tmp_file = None

    # --- resolve bot script path ---
    bot_code_b64 = os.environ.get("BIGAS_BOT_CODE")
    if bot_code_b64:
        # Decode and write to a temp file
        try:
            bot_code = base64.b64decode(bot_code_b64).decode("utf-8")
        except Exception as e:
            print(json.dumps({"error": f"Failed to decode bot code: {e}"}), flush=True)
            sys.exit(1)
        tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False)
        tmp.write(bot_code)
        tmp.close()
        bot_script = tmp.name
        tmp_file = tmp.name
    elif len(sys.argv) >= 2:
        bot_script = sys.argv[1]
    else:
        print(json.dumps({"error": "No bot code provided"}), flush=True)
        sys.exit(1)

    if not os.path.isfile(bot_script):
        print(json.dumps({"error": f"Bot script not found: {bot_script}"}), flush=True)
        sys.exit(1)

    # --- spawn bot subprocess ---
    # Pass PYTHONPATH=/app so the bot can `import bigas` (the SDK lives at /app/bigas/).
    bot_env = {**os.environ, "PYTHONPATH": "/app"}
    try:
        proc = subprocess.Popen(
            [sys.executable, bot_script],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            env=bot_env,
        )
    except Exception as e:
        print(json.dumps({"error": f"Failed to start bot: {e}"}), flush=True)
        sys.exit(1)

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
        t.join(timeout=BOT_TICK_TIMEOUT)
        if t.is_alive():
            return None
        return result[0]

    engine = GameEngine(send_fn=send_fn, recv_fn=recv_fn)

    try:
        replay = engine.run()
    except Exception as e:
        replay = {"error": str(e)}
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=2)
        except Exception:
            proc.kill()
        if tmp_file:
            try:
                os.unlink(tmp_file)
            except Exception:
                pass

    print(json.dumps(replay), flush=True)


if __name__ == "__main__":
    main()
