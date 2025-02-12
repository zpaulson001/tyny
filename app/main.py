from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from app.routers import websocket

app = FastAPI()

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
