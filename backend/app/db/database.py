from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from app.utils.logger import setup_logger
from app.config import get_settings

settings = get_settings()
logger = setup_logger(__name__)

def get_database_url() -> str:
    if hasattr(settings, 'DATABASE_URL') and settings.DATABASE_URL:
        return settings.DATABASE_URL
    raise ValueError("No database URL found")

def create_engine_with_retry(database_url: str):
    # CRITICAL: We use NullPool so we don't trip the Supabase Circuit Breaker
    pooling_args = {
        "poolclass": NullPool,
        "echo": False,
    }
    
    connect_args = {}
    
    if database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        pooling_args = {}
    else:
        # Prevent asyncpg from fighting the Supabase Pooler
        connect_args["server_settings"] = {"jit": "off"}
        connect_args["statement_cache_size"] = 0
        connect_args["prepared_statement_cache_size"] = 0

    return create_async_engine(database_url, connect_args=connect_args, **pooling_args)

# Create the engine
engine = create_engine_with_retry(get_database_url())

# Create async session maker
AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False, autocommit=False, autoflush=False
)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    session = AsyncSessionLocal()
    try:
        yield session
    except Exception as e:
        logger.error(f"Database session error: {str(e)}")
        await session.rollback()
        raise
    finally:
        await session.close()

async def init_db() -> None:
    logger.info("Initializing database")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        raise
