"""
ICP Finder — FastAPI service
Wraps find_icps.py as an HTTP API with optional Supabase job tracking.
Falls back to in-memory storage when Supabase is not configured.
"""

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from find_icps import (
    search_platform,
    merge_results,
    REDDIT_PROMPT,
    X_PROMPT,
    LINKEDIN_PROMPT,
    INDIE_HACKERS_PROMPT,
    HACKER_NEWS_PROMPT,
    PRODUCT_HUNT_PROMPT,
    DEV_TO_PROMPT,
)

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Storage backend ---

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

USE_SUPABASE = bool(
    SUPABASE_URL
    and SUPABASE_SERVICE_KEY
    and "your-project" not in SUPABASE_URL
)

supabase = None
if USE_SUPABASE:
    from supabase import create_client, Client as SupabaseClient
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    logger.info("Using Supabase for job storage")
else:
    logger.info("Supabase not configured — using in-memory storage")

# In-memory job store (used when Supabase is not available)
_jobs: dict[str, dict] = {}

# --- FastAPI app ---

app = FastAPI(title="ICP Finder Service")

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Constants ---

PLATFORMS = [
    ("Reddit", REDDIT_PROMPT),
    ("X/Twitter", X_PROMPT),
    ("LinkedIn", LINKEDIN_PROMPT),
    ("Indie Hackers", INDIE_HACKERS_PROMPT),
    ("Hacker News", HACKER_NEWS_PROMPT),
    ("Product Hunt", PRODUCT_HUNT_PROMPT),
    ("Dev.to", DEV_TO_PROMPT),
]


# --- Models ---

class SearchRequest(BaseModel):
    icp_description: str
    user_id: str
    platforms: list[str] | None = None  # optional: subset of platform names


class SearchResponse(BaseModel):
    job_id: str


# --- DB helpers ---

def create_job(user_id: str, icp_description: str, platform_progress: dict) -> str:
    if USE_SUPABASE:
        row = supabase.table("icp_jobs").insert({
            "user_id": user_id,
            "icp_description": icp_description,
            "status": "pending",
            "platform_progress": platform_progress,
        }).execute()
        return row.data[0]["id"]
    else:
        job_id = str(uuid.uuid4())
        _jobs[job_id] = {
            "id": job_id,
            "user_id": user_id,
            "icp_description": icp_description,
            "status": "pending",
            "platform_progress": platform_progress,
            "results": None,
            "error_message": None,
        }
        return job_id


def update_job(job_id: str, **fields):
    if USE_SUPABASE:
        supabase.table("icp_jobs").update(fields).eq("id", job_id).execute()
    else:
        if job_id in _jobs:
            _jobs[job_id].update(fields)


def get_job_data(job_id: str) -> dict | None:
    if USE_SUPABASE:
        row = supabase.table("icp_jobs").select("*").eq("id", job_id).single().execute()
        return row.data
    else:
        return _jobs.get(job_id)


def update_platform_progress(job_id: str, platform: str, status: str, found: int = 0):
    job = get_job_data(job_id)
    if not job:
        return
    progress = job.get("platform_progress", {})
    progress[platform] = {"status": status, "found": found}
    update_job(job_id, platform_progress=progress)


# --- Background task ---

async def run_search(job_id: str, icp_description: str, selected_platforms: list[tuple[str, str]]):
    """Run the multi-platform ICP search; write progress to storage."""
    try:
        update_job(job_id, status="running")

        # Initialize platform progress
        progress = {name: {"status": "pending", "found": 0} for name, _ in selected_platforms}
        update_job(job_id, platform_progress=progress)

        platform_results: list[dict] = []

        for name, prompt in selected_platforms:
            update_platform_progress(job_id, name, "searching")
            try:
                result = await search_platform(name, prompt, icp_description, monitor=None)
                found = len(result.get("results", []))
                update_platform_progress(job_id, name, "done", found)
                platform_results.append(result)
            except Exception as e:
                logger.error("Platform %s failed: %s", name, e)
                update_platform_progress(job_id, name, "error")
                platform_results.append({
                    "platform": name,
                    "results": [],
                    "search_queries_used": [],
                    "platform_notes": f"Agent failed: {e}",
                })

        # Collect all results from successful platforms
        successful_results = [r for r in platform_results if r and r.get("results")]

        if not successful_results:
            update_job(job_id, status="done", results={
                "icp_description": icp_description,
                "search_summary": "All platforms failed — no results found.",
                "results": [],
                "search_queries_used": [],
                "recommendations": "",
            })
            logger.info("Job %s completed with 0 results (all platforms failed)", job_id)
            return

        # Merge — fall back to raw concatenation if merge agent fails
        update_job(job_id, status="running")
        try:
            merged = await merge_results(
                icp_description,
                successful_results,
                monitor=None,
            )
        except Exception as e:
            logger.warning("Merge agent failed, falling back to concatenation: %s", e)
            all_results = []
            for r in successful_results:
                all_results.extend(r.get("results", []))
            merged = {
                "icp_description": icp_description,
                "search_summary": "Some platforms succeeded. Merge failed — showing raw results.",
                "results": all_results,
                "search_queries_used": [],
                "recommendations": "",
            }

        update_job(job_id, status="done", results=merged)
        logger.info("Job %s completed with %d results", job_id, len(merged.get("results", [])))

    except Exception as e:
        logger.exception("Job %s failed", job_id)
        update_job(job_id, status="error", error_message=str(e))


# --- Routes ---

@app.post("/search", response_model=SearchResponse)
async def start_search(req: SearchRequest):
    """Create a job and kick off the ICP search in the background."""
    # Filter platforms if requested
    if req.platforms:
        selected = [(n, p) for n, p in PLATFORMS if n in req.platforms]
        if not selected:
            raise HTTPException(400, f"No valid platforms. Choose from: {[n for n, _ in PLATFORMS]}")
    else:
        selected = PLATFORMS

    platform_progress = {name: {"status": "pending", "found": 0} for name, _ in selected}
    job_id = create_job(req.user_id, req.icp_description, platform_progress)

    # Fire and forget
    asyncio.create_task(run_search(job_id, req.icp_description, selected))

    return SearchResponse(job_id=job_id)


@app.get("/jobs/{job_id}")
async def get_job(job_id: str):
    """Get job status."""
    data = get_job_data(job_id)
    if not data:
        raise HTTPException(404, "Job not found")
    return data


@app.get("/health")
async def health():
    return {"status": "ok", "service": "icp-finder", "storage": "supabase" if USE_SUPABASE else "memory"}
