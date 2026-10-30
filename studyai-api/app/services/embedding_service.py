from functools import lru_cache


MODEL_NAME = "intfloat/multilingual-e5-small"
EMBEDDING_DIMENSIONS = 384


@lru_cache(maxsize=1)
def get_embedding_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(MODEL_NAME)


def embed_passages(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    if any(not isinstance(text, str) or not text.strip() for text in texts):
        raise ValueError("Los fragmentos no pueden estar vacíos")

    passages = [f"passage: {text.strip()}" for text in texts]

    embeddings = get_embedding_model().encode(
        passages,
        normalize_embeddings=True,
    )

    vectors = embeddings.tolist()

    if any(len(vector) != EMBEDDING_DIMENSIONS for vector in vectors):
        raise ValueError("Dimensiones de embedding incorrectas")

    return vectors


def embed_query(question: str) -> list[float]:
    if not isinstance(question, str) or not question.strip():
        raise ValueError("La pregunta no puede estar vacía")

    embedding = get_embedding_model().encode(
        f"query: {question.strip()}",
        normalize_embeddings=True,
    )

    vector = embedding.tolist()

    if len(vector) != EMBEDDING_DIMENSIONS:
        raise ValueError("Dimensiones de embedding incorrectas")

    return vector