"""
Docker-based bot runner.
Builds the bigas-runner image once at startup, then spins up a container
per submission to execute engine/runner.py with the bot script.
"""
import asyncio
import base64
import json
import os
import logging

import docker
from docker.errors import BuildError, ContainerError, ImageNotFound

logger = logging.getLogger(__name__)

IMAGE_NAME = "bigas-runner"
CONTAINER_TIMEOUT = 60       # seconds max per full game run (5 cycles × 100 ticks)
MEMORY_LIMIT = "256m"
CPU_QUOTA = 50000            # 50% of one CPU (100000 = 1 full CPU)
DOCKERFILE_PATH = os.path.join(os.path.dirname(__file__), "..")  # project root


_client: docker.DockerClient = None


def get_client() -> docker.DockerClient:
    global _client
    if _client is None:
        _client = docker.from_env()
    return _client


def build_image():
    """
    Build the bigas-runner Docker image if it doesn't already exist.
    When running via Docker Compose the image is pre-built as its own service,
    so this is a no-op. When running locally it builds from the project root.
    """
    client = get_client()
    try:
        client.images.get(IMAGE_NAME)
        logger.info("bigas-runner image already exists, skipping build.")
        return
    except docker.errors.ImageNotFound:
        pass

    logger.info("Building bigas-runner Docker image...")
    try:
        image, logs = client.images.build(
            path=os.path.abspath(DOCKERFILE_PATH),
            tag=IMAGE_NAME,
            rm=True,
            forcerm=True,
        )
        logger.info("bigas-runner image built successfully: %s", image.id[:12])
    except BuildError as e:
        logger.error("Docker image build failed: %s", e)
        raise


async def run_bot(bot_code: str) -> dict:
    """
    Base64-encode bot_code, pass it to the container via env var BIGAS_BOT_CODE,
    run the game, and return the parsed replay dict.
    Raises RuntimeError on failure.
    """
    client = get_client()
    bot_code_b64 = base64.b64encode(bot_code.encode("utf-8")).decode("ascii")

    loop = asyncio.get_event_loop()
    try:
        output = await loop.run_in_executor(
            None,
            lambda: _run_container(client, bot_code_b64),
        )
    except Exception as e:
        raise RuntimeError(f"Container execution failed: {e}") from e

    output = output.strip()
    if not output:
        raise RuntimeError("Bot produced no output")

    try:
        replay = json.loads(output)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Invalid replay JSON from bot: {e}") from e

    if "error" in replay and "final_score" not in replay:
        raise RuntimeError(replay["error"])

    return replay


def _run_container(client: docker.DockerClient, bot_code_b64: str) -> str:
    """Synchronous container run — called via executor to avoid blocking."""
    container = None
    try:
        container = client.containers.run(
            IMAGE_NAME,
            environment={"BIGAS_BOT_CODE": bot_code_b64},
            network_disabled=True,
            mem_limit=MEMORY_LIMIT,
            cpu_quota=CPU_QUOTA,
            detach=True,
            stdout=True,
            stderr=False,
        )
        result = container.wait(timeout=CONTAINER_TIMEOUT)
        exit_code = result.get("StatusCode", 0)

        output = container.logs(stdout=True, stderr=False)
        output = output.decode("utf-8") if isinstance(output, bytes) else output

        if exit_code != 0:
            stderr = container.logs(stdout=False, stderr=True)
            stderr = stderr.decode("utf-8") if isinstance(stderr, bytes) else stderr
            raise RuntimeError(f"Container exited {exit_code}: {stderr.strip()}")

        return output
    except docker.errors.ImageNotFound:
        raise RuntimeError(f"Docker image '{IMAGE_NAME}' not found. Was it built?")
    finally:
        if container:
            try:
                container.remove(force=True)
            except Exception:
                pass
