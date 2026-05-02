from sqlalchemy import Column, Integer, String, Float
from Semestrálka.backend.db import Base

class POI(Base):
    __tablename__ = "pois"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    affiliation = Column(String)