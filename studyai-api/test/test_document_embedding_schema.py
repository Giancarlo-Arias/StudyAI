from sqlalchemy import create_engine, text

from app.db.connection import get_engine


def test_document_embedding_schema():
    test_url = get_engine().url.set(database="studyai_test_db")
    engine = create_engine(test_url, pool_pre_ping=True)

    try:
        with engine.connect() as connection:
            database = connection.execute(
                text("SELECT current_database()")
            ).scalar_one()

            assert database == "studyai_test_db"

            extension = connection.execute(
                text("""
                    SELECT extname
                    FROM pg_extension
                    WHERE extname = 'vector'
                """)
            ).scalar_one()

            assert extension == "vector"

            embedding_type = connection.execute(
                text("""
                    SELECT format_type(atttypid, atttypmod)
                    FROM pg_attribute
                    WHERE attrelid = 'public.document_chunks'::regclass
                      AND attname = 'embedding'
                """)
            ).scalar_one()

            assert embedding_type == "vector(384)"

    finally:
        engine.dispose()