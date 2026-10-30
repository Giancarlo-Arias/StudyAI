from uuid import uuid4

import pytest

from app.services import chunk_embedding_service


def test_generate_and_save_chunk_embedding(monkeypatch):
    chunk_id = uuid4()
    user_id = 10
    chunk_text = "Python permite desarrollar aplicaciones."
    vector = [0.1] * 384

    calls = []

    def fake_embed_passages(texts):
        calls.append(("embed", texts))
        return [vector]

    def fake_save_chunk_embedding_for_user(
        chunk_id,
        user_id,
        embedding,
    ):
        calls.append(("save", chunk_id, user_id, embedding))
        return True

    monkeypatch.setattr(
        chunk_embedding_service,
        "embed_passages",
        fake_embed_passages,
    )

    monkeypatch.setattr(
        chunk_embedding_service,
        "save_chunk_embedding_for_user",
        fake_save_chunk_embedding_for_user,
    )

    result = chunk_embedding_service.generate_and_save_chunk_embedding(
        chunk_id,
        user_id,
        chunk_text,
    )

    assert result is True
    assert calls == [
        ("embed", [chunk_text]),
        ("save", chunk_id, user_id, vector),
    ]


def test_generate_and_save_returns_false_when_not_authorized(monkeypatch):
    chunk_id = uuid4()

    monkeypatch.setattr(
        chunk_embedding_service,
        "embed_passages",
        lambda texts: [[0.1] * 384],
    )

    monkeypatch.setattr(
        chunk_embedding_service,
        "save_chunk_embedding_for_user",
        lambda chunk_id, user_id, embedding: False,
    )

    result = chunk_embedding_service.generate_and_save_chunk_embedding(
        chunk_id,
        20,
        "Texto de prueba",
    )

    assert result is False


def test_generate_and_save_rejects_empty_text(monkeypatch):
    calls = []

    def fake_embed_passages(texts):
        calls.append(texts)
        return [[0.1] * 384]

    monkeypatch.setattr(
        chunk_embedding_service,
        "embed_passages",
        fake_embed_passages,
    )

    with pytest.raises(ValueError, match="vacío"):
        chunk_embedding_service.generate_and_save_chunk_embedding(
            uuid4(),
            10,
            "   ",
        )

    assert calls == []