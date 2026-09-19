"""
Single shared entry point for connecting to Postgres from any ML script.

Deliberately talks to Postgres directly (not through the Node backend) —
see the architecture note in the main README: the ML pipeline is never in
the request path of a live API call, it runs on its own schedule and reads/
writes the same tables Prisma created.
"""
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

load_dotenv()


def get_engine() -> Engine:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL is not set. Copy ml/.env.example to ml/.env and fill it in "
            "with the same Neon connection string used by the backend."
        )
    return create_engine(database_url, pool_pre_ping=True)
