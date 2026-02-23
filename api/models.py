from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class SubmitResponse(BaseModel):
    job_id: str


class JobStatus(BaseModel):
    job_id: str
    status: str  # pending | running | complete | error
    bot_name: str
    submitted_at: datetime
    result: Optional[dict] = None
    error: Optional[str] = None


class LeaderboardEntry(BaseModel):
    rank: int
    job_id: str
    bot_name: str
    final_score: float
    cycle_scores: List[float]
    submitted_at: datetime
