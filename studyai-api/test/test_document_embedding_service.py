from uuid import uuid4

import pytest

from app.services import document_embedding_service


def test_generate_embeddings_for_all_document_chunks(monkeypatch):
    document_id = uuid4()
    user_id = 10

    chunks = [
        {"id": uuid4(), "text": "Primer fragmento."},
        {"id": uuid4(), "text": "Segundo fragmento."},
        {"id": uuid4(), "text": "Tercer fragmento."},
    ]

    pending_batches = [
        chunks[:2],
        chunks[2:],
        [],
    ]

    generated_texts = []
    saved_chunks = []

    def fake_list_pending(document_id, user_id, limit):
        assert limit == 2
        return pending_batches.pop(0)

    def fake_embed_passages(texts):
        generated_texts.extend(texts)
        return [[0.1] * 384 for _ in texts]

    def fake_save_chunk_embedding_for_user(
        chunk_id,
        user_id,
        embedding,
    ):
        saved_chunks.append(chunk_id)
        assert len(embedding) == 384
        return True

    monkeypatch.setattr(
        document_embedding_service,
        "list_pending_document_chunks_for_user",
        fake_list_pending,
    )

    monkeypatch.setattr(
        document_embedding_service,
        "embed_passages",
        fake_embed_passages,
    )

    monkeypatch.setattr(
        document_embedding_service,
        "save_chunk_embedding_for_user",
        fake_save_chunk_embedding_for_user,
    )

    result = document_embedding_service.generate_and_save_document_embeddings(
        document_id=document_id,
        user_id=user_id,
        batch_size=2,
    )

    assert result == 3

    assert generated_texts == [
        "Primer fragmento.",
        "Segundo fragmento.",
        "Tercer fragmento.",
    ]

    assert saved_chunks == [
        chunk["id"] for chunk in chunks
    ]


def test_document_without_pending_embeddings(monkeypatch):
    def fake_list_pending(document_id, user_id, limit):
        return []

    monkeypatch.setattr(
        document_embedding_service,
        "list_pending_document_chunks_for_user",
        fake_list_pending,
    )

    result = document_embedding_service.generate_and_save_document_embeddings(
        document_id=uuid4(),
        user_id=10,
    )

    assert result == 0


def test_document_embedding_rejects_invalid_batch_size():
    with pytest.raises(ValueError, match="lote"):
        document_embedding_service.generate_and_save_document_embeddings(
            document_id=uuid4(),
            user_id=10,
            batch_size=0,
        )


def test_document_embedding_raises_when_save_fails(monkeypatch):
    chunk = {
        "id": uuid4(),
        "text": "Fragmento de prueba.",
    }

    monkeypatch.setattr(
        document_embedding_service,
        "list_pending_document_chunks_for_user",
        lambda document_id, user_id, limit: [chunk],
    )

    monkeypatch.setattr(
        document_embedding_service,
        "embed_passages",
        lambda texts: [[0.1] * 384],
    )

    monkeypatch.setattr(
        document_embedding_service,
        "save_chunk_embedding_for_user",
        lambda chunk_id, user_id, embedding: False,
    )

    with pytest.raises(RuntimeError, match="guardar"):
        document_embedding_service.generate_and_save_document_embeddings(
            document_id=uuid4(),
            user_id=10,
        )