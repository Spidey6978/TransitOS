from pydantic import BaseModel
from typing import List, Optional

class TicketRequest(BaseModel):
    commuter_name: str
    from_station: str
    to_station: str
    mode: str
    ticket_id: str  # Add this! Every ticket must now have a unique ID

class TicketResponse(BaseModel):
    status: str
    tx_hash: str
    fare: float
    split: str
    from_station: str
    to_station: str
    distance_km: float

class SyncResponse(BaseModel):
    status: str
    total_received: int
    results: List[dict]

class OfflineSyncPayload(BaseModel):
    tickets: List[TicketRequest]