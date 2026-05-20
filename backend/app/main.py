from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.routers import analysis
from app.services.data_service import data_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Asset Correlation Monitor API started")
    # Initialize data/cache on startup
    data_service.ensure_data()
    yield
    print("Asset Correlation Monitor API shutdown")

app = FastAPI(
    title="Asset Correlation Monitor API",
    description="ETF Correlation and Asset Allocation Monitor",
    version="1.0.0",
    lifespan=lifespan,
)

cors_origins = os.getenv("CORS_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins.split(",") if cors_origins != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis.router)

@app.get("/")
async def root():
    return {"status": "running", "service": "Asset Correlation Monitor API"}

@app.get("/api/v1/health")
async def health():
    from datetime import datetime
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}
