from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class PassengerInfo(BaseModel):
    adults: int = 1
    childrenWithSeats: int = 0
    children: int = 0
    totalPassengers: int = 1

class TripLeg(BaseModel):
    id: Optional[str] = None
    mode: str
    from_location: str = Field(alias="from", default="")
    to_location: str = Field(alias="to", default="")
    status: Optional[str] = "confirmed"
    estimatedFare: Optional[float] = 0.0
    isPrivate: Optional[bool] = False

    class Config:
        populate_by_name = True

class TicketRequest(BaseModel):
    commuter_name: str
    from_station: str
    to_station: str
    mode: str
    ticket_class: str = "Standard"
    ticket_id: str
    adults: int = 1
    children: int = 0
    passengers: Optional[PassengerInfo] = None
    legs: Optional[List[TripLeg]] = []

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

# --- V4 GIG TRANSIT MODELS ---
class Coordinate(BaseModel):
    lat: float
    lng: float

class PrivateLegPayload(BaseModel):
    leg_id: str
    mode: str
    pickup_label: str
    drop_label: str
    pickup_coords: Optional[Coordinate] = None
    drop_coords: Optional[Coordinate] = None
    estimated_fare: float
    estimated_distance_km: Optional[float] = None
    status: str

class BookPrivateLegsRequest(BaseModel):
    ticket_id: str
    commuter_name: str
    passengers: PassengerInfo
    legs: List[PrivateLegPayload]

# --- V3 DRIVER MODELS ---
class DriverScanRequest(BaseModel):
    ticket_id: str
    driver_wallet: str
    vehicle_id: str

class FiatWithdrawal(BaseModel):
    driver_id: str
    driver_wallet: str
    amount_inr: float