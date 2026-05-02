from fastapi import FastAPI
from pydantic import BaseModel
from db import Base, engine, SessionLocal
from models import POI
from middleware import AuthMiddleware
from auth import ADMIN_USER, ADMIN_PASS, ADMIN_TOKEN

Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(AuthMiddleware)

# ---------------- LOGIN ----------------
@app.post("/login")
def login(data: dict):
    if data["username"] == ADMIN_USER and data["password"] == ADMIN_PASS:
        return {"token": ADMIN_TOKEN}
    return {"error": "invalid credentials"}

# ---------------- DTO ----------------
class POISchema(BaseModel):
    name: str
    lat: float
    lon: float
    affiliation: str

# ---------------- DB HELPER ----------------
def get_db():
    return SessionLocal()

# ---------------- CREATE ----------------
@app.post("/api/pois")
def create_poi(poi: POISchema):
    db = get_db()
    obj = POI(**poi.dict())
    db.add(obj)
    db.commit()
    return {"status": "created"}

# ---------------- READ ----------------
@app.get("/api/pois")
def get_pois():
    db = get_db()
    return db.query(POI).all()

# ---------------- UPDATE ----------------
@app.put("/api/pois/{poi_id}")
def update_poi(poi_id: int, poi: POISchema):
    db = get_db()
    obj = db.query(POI).filter(POI.id == poi_id).first()
    if obj:
        obj.name = poi.name
        obj.lat = poi.lat
        obj.lon = poi.lon
        obj.affiliation = poi.affiliation
        db.commit()
    return {"status": "updated"}

# ---------------- DELETE ----------------
@app.delete("/api/pois/{poi_id}")
def delete_poi(poi_id: int):
    db = get_db()
    obj = db.query(POI).filter(POI.id == poi_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return {"status": "deleted"}