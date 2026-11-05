from uuid import uuid4

from app.schemas.quiz_generation import GeneratedQuiz
from app.services.quiz_rag_service import shuffle_quiz_options


def make_quiz(question_count: int) -> GeneratedQuiz:
    chunk_id = uuid4()

    return GeneratedQuiz.model_validate({
        "questions": [
            {
                "question_text": f"Pregunta educativa {index + 1}",
                "options": [
                    "Opción incorrecta A",
                    "Respuesta correcta",
                    "Opción incorrecta C",
                    "Opción incorrecta D",
                ],
                "correct_option": 1,
                "explanation": "Explicación de la respuesta correcta.",
                "chunk_id": str(chunk_id),
            }
            for index in range(question_count)
        ]
    })


def test_shuffle_preserves_correct_answers():
    quiz = make_quiz(3)

    shuffled = shuffle_quiz_options(quiz)

    assert len(shuffled.questions) == 3

    for question in shuffled.questions:
        assert (
            question.options[question.correct_option]
            == "Respuesta correcta"
        )

        assert question.explanation == (
            "Explicación de la respuesta correcta."
        )

    # No modificar el cuestionario original
    assert all(
        question.correct_option == 1
        for question in quiz.questions
    )


def test_shuffle_distributes_correct_positions():
    quiz = make_quiz(3)

    shuffled = shuffle_quiz_options(quiz)

    positions = [
        question.correct_option
        for question in shuffled.questions
    ]

    # Con tres preguntas, ninguna repite posición correcta
    assert len(set(positions)) == 3


def test_shuffle_balances_many_questions():
    quiz = make_quiz(8)

    shuffled = shuffle_quiz_options(quiz)

    positions = [
        question.correct_option
        for question in shuffled.questions
    ]

    # Ocho preguntas: dos respuestas correctas por posición
    assert positions.count(0) == 2
    assert positions.count(1) == 2
    assert positions.count(2) == 2
    assert positions.count(3) == 2