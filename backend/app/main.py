from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from app.routers import parakeet_websocket as websocket
from app.services.transcription import ParakeetService
from app.dependencies import set_parakeet_service
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Parakeet model
    parakeet_service = ParakeetService(model_name="mlx-community/parakeet-tdt-0.6b-v2")
    parakeet_service.load_model()
    set_parakeet_service(parakeet_service)
    yield
    # Shutdown: Clean up resources if needed
    set_parakeet_service(None)


app = FastAPI(lifespan=lifespan)

# Include the websocket router
app.include_router(websocket.router)

# Initialize Jinja2 templates
templates = Jinja2Templates(directory="app/templates")


@app.get("/", response_class=HTMLResponse)
async def get(request: Request):
    # You can adjust the websocket_url based on your configuration
    return templates.TemplateResponse(
        "index.html", {"request": request, "websocket_url": "localhost:3000"}
    )
