from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError

from app.db.connection import get_engine


# Comprobar que PostgreSQL rechaza documentos sin propietario
def test_document_requires_user_id():
    test_url = get_engine().url.set(database="studyai_test_db")
    engine = create_engine(test_url, pool_pre_ping=True)

    document_id = uuid4()

    try:
        with engine.connect() as connection:

            assert connection.execute(
                text("SELECT current_database()")
            ).scalar_one() == "studyai_test_db"

            try:
                # Intentar guardar un documento sin propietario
                with pytest.raises(IntegrityError) as exc_info:
                    connection.execute(
                        text("""
                            INSERT INTO documents (
                                id,
                                filename,
                                size_bytes,
                                pages_with_text,
                                text_length,
                                user_id
                            )
                            VALUES (
                                :id,
                                'sin-propietario.pdf',
                                100,
                                1,
                                50,
                                NULL
                            );
                        """),
                        {"id": document_id},
                    )

                # PostgreSQL: 23502 = violación de NOT NULL
                assert exc_info.value.orig.sqlstate == "23502"

            finally:
                connection.rollback()

            # Confirmar que no se guardó el documento
            count = connection.execute(
                text("""
                    SELECT COUNT(*)
                    FROM documents
                    WHERE id = :document_id;
                """),
                {"document_id": document_id},
            ).scalar_one()

            assert count == 0

    finally:
        engine.dispose()