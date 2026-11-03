import os
from sqlmodel import SQLModel, Session, create_engine
import dotenv
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", 
"postgresql+psycopg2://postgres:12348765@localhost:5432/viajes_lanena")


engine = create_engine(
    DATABASE_URL, 
    echo=True,
    connect_args={"client_encoding": "utf8"}
)

def init_db():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session