# models.py
# Shared request/response schemas for the TransitOS API.
# Dev 3 (Frontend) and Dev 4 (Dashboard) use these JSON shapes for mocking.

from pydantic import BaseModel, Field
from typing import List, Optional


# ── INCOMING ──────────────────────────────────────────────

class TicketRequest(BaseModel):
    """Single ticket booking — used by /book_ticket"""
    commuter_name: str = Field(..., example="Rahul Sharma")
    from_station: str  = Field(..., example="Andheri")
    to_station: str    = Field(..., example="CST")
    mode: str          = Field(..., example="Local Train")
    # Mode options: "Local Train", "Metro", "AC Metro", "Hybrid", "Ferry"


class OfflineSyncPayload(BaseModel):
    """Batch of tickets queued while offline — used by /sync_offline"""
    tickets: List[TicketRequest]


# ── OUTGOING ──────────────────────────────────────────────

class TicketResponse(BaseModel):
    """What /book_ticket sends back to the frontend"""
    status: str    = Field(..., example="success")
    tx_hash: str   = Field(..., example="0x4a7f2c1d9e3b...")
    fare: float    = Field(..., example=47.50)
    split: str     = Field(..., example="Railways: ₹45.1 | TransitOS: ₹2.4")
    from_station: str
    to_station: str
    distance_km: float


class SyncResponse(BaseModel):
    """What /sync_offline sends back after processing a batch"""
    status: str        = Field(..., example="queued")
    total_received: int = Field(..., example=5)
    results: list      = Field(..., example=[])