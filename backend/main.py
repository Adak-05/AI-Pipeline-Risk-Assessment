"""
Municipal Pipeline Risk Assessment System - FastAPI Backend
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routers import pipelines, inspections, risk_assessment, work_orders, sync, dashboard, auth

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Municipal Pipeline Risk System backend...")
    if not settings.supabase_url or settings.supabase_url == "https://your-project.supabase.co":
        logger.warning(
            "⚠️  Supabase not configured. Copy backend/.env.example to backend/.env "
            "and fill in your credentials. The API will start but DB operations will fail."
        )
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Municipal Pipeline Risk Assessment API",
    description=(
        "Backend API for the AI Pipeline Risk Assessment and Municipal Maintenance Management System. "
        "Provides endpoints for pipeline management, risk assessment, inspections, work orders, "
        "GIS data synchronization, and dashboard statistics."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - allow the Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(pipelines.router, prefix="/api/pipelines", tags=["Pipelines"])
app.include_router(inspections.router, prefix="/api/inspections", tags=["Inspections"])
app.include_router(risk_assessment.router, prefix="/api/risk-assessments", tags=["Risk Assessment"])
app.include_router(work_orders.router, prefix="/api/work-orders", tags=["Work Orders"])
app.include_router(sync.router, prefix="/api/sync", tags=["Data Synchronization"])


@app.get("/", tags=["Health"])
def root():
    return {
        "service": "Municipal Pipeline Risk Assessment API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
