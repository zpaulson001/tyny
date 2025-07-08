import httpx
from app.services.rooms import SSEManager


sse_manager: SSEManager = SSEManager()
httpx_client: httpx.AsyncClient = httpx.AsyncClient()
