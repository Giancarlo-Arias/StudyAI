import pytest

from app.services import dashboard_service


@pytest.fixture
def dashboard_environment(monkeypatch):
    calls = []

    progress = {
        "total_quizzes": 2,
        "quizzes_completed": 1,
        "total_attempts": 1,
        "average_score_percent": 66.67,
        "best_score_percent": 66.67,
        "recent_attempts": [],
    }

    documents = [{
        "filename": "tecnologia.pdf",
        "total_quizzes": 2,
    }]

    achievements = [{
        "code": "first_quiz",
        "unlocked": True,
    }]

    def fake_progress(user_id):
        calls.append(("progress", user_id))
        return progress

    def fake_documents(user_id):
        calls.append(("documents", user_id))
        return documents

    def fake_achievements(user_id):
        calls.append(("achievements", user_id))
        return achievements

    monkeypatch.setattr(
        dashboard_service,
        "get_progress_for_user",
        fake_progress,
    )

    monkeypatch.setattr(
        dashboard_service,
        "list_document_progress_for_user",
        fake_documents,
    )

    monkeypatch.setattr(
        dashboard_service,
        "get_achievements_for_user",
        fake_achievements,
    )

    return {
        "progress": progress,
        "documents": documents,
        "achievements": achievements,
        "calls": calls,
    }


def test_dashboard_combines_user_data(dashboard_environment):
    data = dashboard_environment

    result = dashboard_service.get_dashboard_for_user(
        user_id=2,
    )

    assert result["progress"] == data["progress"]
    assert result["documents"] == data["documents"]
    assert result["achievements"] == data["achievements"]

    assert data["calls"] == [
        ("progress", 2),
        ("documents", 2),
        ("achievements", 2),
    ]


def test_dashboard_without_activity(
    dashboard_environment,
):
    data = dashboard_environment

    data["progress"]["total_quizzes"] = 0
    data["progress"]["quizzes_completed"] = 0
    data["progress"]["total_attempts"] = 0
    data["documents"].clear()
    data["achievements"].clear()

    result = dashboard_service.get_dashboard_for_user(
        user_id=2,
    )

    assert result["progress"]["total_attempts"] == 0
    assert result["documents"] == []
    assert result["achievements"] == []


@pytest.mark.parametrize(
    "user_id",
    [0, -1, True, "2"],
)
def test_dashboard_rejects_invalid_user(
    dashboard_environment,
    user_id,
):
    with pytest.raises(ValueError, match="usuario"):
        dashboard_service.get_dashboard_for_user(
            user_id=user_id,
        )

    assert dashboard_environment["calls"] == []