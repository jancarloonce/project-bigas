"""
In-memory job store and async worker queue.
Jobs are submitted, queued, and processed concurrently by asyncio tasks.
"""
import asyncio
import uuid
from datetime import datetime, timezone
from typing import Dict, Optional


class Job:
    def __init__(self, bot_name: str, bot_code: str):
        self.job_id = str(uuid.uuid4())[:8]
        self.bot_name = bot_name
        self.bot_code = bot_code
        self.status = "pending"
        self.submitted_at = datetime.now(timezone.utc)
        self.result: Optional[dict] = None
        self.error: Optional[str] = None

    def to_dict(self):
        return {
            "job_id": self.job_id,
            "status": self.status,
            "bot_name": self.bot_name,
            "submitted_at": self.submitted_at.isoformat(),
            "result": self.result,
            "error": self.error,
        }


class JobStore:
    def __init__(self):
        self._jobs: Dict[str, Job] = {}
        self._queue: asyncio.Queue = None

    def init(self):
        """Must be called inside an async context (on app startup)."""
        self._queue = asyncio.Queue()

    def create(self, bot_name: str, bot_code: str) -> Job:
        job = Job(bot_name, bot_code)
        self._jobs[job.job_id] = job
        return job

    def enqueue(self, job: Job):
        self._queue.put_nowait(job)

    def get(self, job_id: str) -> Optional[Job]:
        return self._jobs.get(job_id)

    def leaderboard(self):
        """Return completed jobs sorted by final_score descending."""
        completed = [
            j for j in self._jobs.values()
            if j.status == "complete" and j.result
        ]
        completed.sort(key=lambda j: j.result.get("final_score", 0), reverse=True)
        return completed

    async def worker(self, run_fn):
        """
        Async worker that pulls jobs from the queue and runs them.
        run_fn(job) is an async callable that executes the bot and updates job.
        Launch multiple workers for concurrency.
        """
        while True:
            job = await self._queue.get()
            try:
                await run_fn(job)
            except Exception as e:
                job.status = "error"
                job.error = str(e)
            finally:
                self._queue.task_done()


job_store = JobStore()
