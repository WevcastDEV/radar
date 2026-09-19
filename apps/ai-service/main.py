from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from routers import recommendations, routes, regions, scoring, heatmap
from database import engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    yield
    # Shutdown actions
    await engine.dispose()

app = FastAPI(
    title="Radar de Oportunidades - AI Service",
    description="AI and Data Analysis service for commercial prospection in the electronic security segment.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recommendations.router)
app.include_router(routes.router)
app.include_router(regions.router)
app.include_router(scoring.router)
app.include_router(heatmap.router)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ai-service"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
