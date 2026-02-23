from fastapi import APIRouter, Form, File, UploadFile, HTTPException
from typing import Optional
from api.jobs import job_store
from api.models import SubmitResponse, JobStatus

router = APIRouter()

MAX_CODE_SIZE = 64 * 1024  # 64 KB


@router.post("/submit", response_model=SubmitResponse, status_code=202)
async def submit_bot(
    bot_name: str = Form(...),
    code: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    if not code and not file:
        raise HTTPException(status_code=422, detail="Provide either 'code' or 'file'.")

    if file:
        if not file.filename.endswith(".py"):
            raise HTTPException(status_code=422, detail="Only .py files are accepted.")
        raw = await file.read(MAX_CODE_SIZE + 1)
        if len(raw) > MAX_CODE_SIZE:
            raise HTTPException(status_code=422, detail="Bot script exceeds 64 KB limit.")
        bot_code = raw.decode("utf-8", errors="replace")
    else:
        if len(code) > MAX_CODE_SIZE:
            raise HTTPException(status_code=422, detail="Bot script exceeds 64 KB limit.")
        bot_code = code

    bot_name = bot_name.strip()[:64] or "UnnamedBot"

    job = job_store.create(bot_name, bot_code)
    job_store.enqueue(job)

    return SubmitResponse(job_id=job.job_id)


@router.get("/jobs/{job_id}", response_model=JobStatus)
async def get_job(job_id: str):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return JobStatus(**job.to_dict())
