from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
import app.models  # ensure models are registered
from app.routers import auth, accounts, interactions, opportunities, tasks, webhooks, erp, imports, mailing, ai


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API de Nexus CRM - Core, Embudo, Integración ERP, Mailing e Inteligencia Artificial BYOK",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits local dev frontends
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(accounts.router, prefix=settings.API_V1_PREFIX)
app.include_router(interactions.router, prefix=settings.API_V1_PREFIX)
app.include_router(opportunities.router, prefix=settings.API_V1_PREFIX)
app.include_router(tasks.router, prefix=settings.API_V1_PREFIX)
app.include_router(webhooks.router, prefix=settings.API_V1_PREFIX)
app.include_router(erp.router, prefix=settings.API_V1_PREFIX)
app.include_router(imports.router, prefix=settings.API_V1_PREFIX)
app.include_router(mailing.router, prefix=settings.API_V1_PREFIX)
app.include_router(ai.router, prefix=settings.API_V1_PREFIX)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "database": "connected",
        "version": "1.0.0",
    }
