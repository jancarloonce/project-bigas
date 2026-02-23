import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.jobs import job_store
from api.docker_runner import build_image, run_bot
from api.routes.submissions import router as submissions_router
from api.routes.leaderboard import router as leaderboard_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

NUM_WORKERS = 4  # concurrent bot runs


async def process_job(job):
    job.status = "running"
    try:
        replay = await run_bot(job.bot_code)
        job.result = replay
        job.status = "complete"
        logger.info("Job %s complete — score: %.1f", job.job_id, replay.get("final_score", 0))
    except Exception as e:
        job.status = "error"
        job.error = str(e)
        logger.error("Job %s failed: %s", job.job_id, e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    job_store.init()
    build_image()  # no-op if image already exists (Docker Compose case)

    workers = [
        asyncio.create_task(job_store.worker(process_job))
        for _ in range(NUM_WORKERS)
    ]
    logger.info("Started %d job workers", NUM_WORKERS)

    yield

    # Shutdown
    for w in workers:
        w.cancel()


app = FastAPI(title="Bigas API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(submissions_router)
app.include_router(leaderboard_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
