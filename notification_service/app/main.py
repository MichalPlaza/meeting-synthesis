import asyncio
from typing import Dict, List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends

from .redis_listener import redis_listener

app = FastAPI(title="Notification Service")


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        print(f"User {user_id} connected. Total connections for user: {len(self.active_connections[user_id])}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        print(f"User {user_id} disconnected.")

    async def broadcast_to_user(self, user_id: str, message: str):
        if user_id in self.active_connections:
            connections = self.active_connections[user_id][:]
            for connection in connections:
                await connection.send_text(message)


manager = ConnectionManager()


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(redis_listener(manager))


async def get_user_id_from_token(token: str) -> str:
    # TODO: W przyszłości zaimplementować pełną walidację JWT tokena
    return token


@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, user_id: str = Depends(get_user_id_from_token)):
    await manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
