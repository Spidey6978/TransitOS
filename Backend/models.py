from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class TicketRequest(BaseModel):
    commuter_name: str
    from_station: str
    to_station: str
    mode: str
    ticket_class: str = "Standard"
    ticket_id: str
    adults: int = 1
    children: int = 0
    passengers: Optional[Dict[str, int]] = None

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
    scanner_mode: Optional[str] = "Validator"
    scanned_qrs: Optional[List[str]] = None
    tickets: Optional[List[Any]] = None

class ValidateTicketRequest(BaseModel):
    ticket_id: str
