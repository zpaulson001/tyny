from fastapi import FastAPI
from app.routers import rooms


app = FastAPI()

app.include_router(rooms.router)
