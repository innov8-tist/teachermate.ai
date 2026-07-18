from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

from db_service.db import Base
from db_service import db_schema
from modules.auth import models as auth_models

import os
from dotenv import load_dotenv

load_dotenv()

DB_URL=os.getenv("DB_URL_POSTGRES")
config = context.config
config.set_main_option("sqlalchemy.url",DB_URL)
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

        try:
            from db_service.seed_data import seed_subjects, seed_students
            from sqlalchemy.exc import ProgrammingError
            import psycopg2.errors

            print("\n" + "=" * 50)
            print("AUTO-SEEDING DEFAULT DATA")
            print("=" * 50)
            seed_subjects(silent=False)
            seed_students(silent=False)
            print("=" * 50)
            print("✓ AUTO-SEEDING COMPLETE")
            print("=" * 50 + "\n")
        except (ProgrammingError, psycopg2.errors.UndefinedTable):
            pass
        except Exception as e:
            print(f"⚠️  Seeding error: {e}")
            import traceback
            traceback.print_exc()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
