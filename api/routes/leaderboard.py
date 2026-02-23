from fastapi import APIRouter
from typing import List
from api.jobs import job_store
from api.models import LeaderboardEntry

router = APIRouter()


@router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard():
    entries = job_store.leaderboard()
    result = []
    for rank, job in enumerate(entries, start=1):
        result.append(LeaderboardEntry(
            rank=rank,
            job_id=job.job_id,
            bot_name=job.bot_name,
            final_score=job.result["final_score"],
            cycle_scores=job.result["cycle_scores"],
            submitted_at=job.submitted_at,
        ))
    return result
