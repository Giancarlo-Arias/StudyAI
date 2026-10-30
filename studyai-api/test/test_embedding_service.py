import pytest

from app.services import embedding_service


class FakeEmbeddingResult:
    def __init__(self, data):
        self.data = data

    def tolist(self):
        return self.data


class FakeEmbeddingModel:
    def __init__(self):
        self.calls = []

    def encode(self, texts, normalize_embeddings=False):
        self.calls.append((texts, normalize_embeddings))

        if isinstance(texts, str):
            return FakeEmbeddingResult([0.1] * 384)

        return FakeEmbeddingResult([
            [0.1] * 384 for _ in texts
        ])


@pytest.fixture
def fake_model(monkeypatch):
    model = FakeEmbeddingModel()

    monkeypatch.setattr(
        embedding_service,
        "get_embedding_model",
        lambda: model,
    )

    return model


def test_embed_passages_generates_vectors(fake_model):
    texts = [
        "Python es un lenguaje de programación.",
        "FastAPI permite desarrollar APIs.",
    ]

    vectors = embedding_service.embed_passages(texts)

    assert len(vectors) == 2
    assert all(len(vector) == 384 for vector in vectors)

    assert fake_model.calls[0] == (
        [
            "passage: Python es un lenguaje de programación.",
            "passage: FastAPI permite desarrollar APIs.",
        ],
        True,
    )


def test_embed_query_generates_vector(fake_model):
    vector = embedding_service.embed_query(
        "¿Para qué sirve Python?"
    )

    assert len(vector) == 384

    assert fake_model.calls[0] == (
        "query: ¿Para qué sirve Python?",
        True,
    )


def test_embed_passages_empty_list(fake_model):
    vectors = embedding_service.embed_passages([])

    assert vectors == []
    assert fake_model.calls == []


def test_embed_passages_rejects_empty_text(fake_model):
    with pytest.raises(ValueError):
        embedding_service.embed_passages([
            "Python es un lenguaje.",
            "   ",
        ])

    assert fake_model.calls == []


def test_embed_query_rejects_empty_question(fake_model):
    with pytest.raises(ValueError):
        embedding_service.embed_query("   ")

    assert fake_model.calls == []


def test_embed_query_rejects_wrong_dimensions(monkeypatch):
    class InvalidEmbeddingModel:
        def encode(self, texts, normalize_embeddings=False):
            return FakeEmbeddingResult([0.1] * 383)

    monkeypatch.setattr(
        embedding_service,
        "get_embedding_model",
        lambda: InvalidEmbeddingModel(),
    )

    with pytest.raises(ValueError, match="Dimensiones"):
        embedding_service.embed_query("¿Qué es Python?")