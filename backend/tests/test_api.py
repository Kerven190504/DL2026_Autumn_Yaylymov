"""
Интеграционные тесты API поверх FastAPI TestClient — без поднятия
реального сервера (в отличие от ручных curl-проверок в процессе
разработки, см. AI_REFLECTION.md).
"""
import os

import pytest
from fastapi.testclient import TestClient

from app import app, SESSIONS
from db import DB_PATH


@pytest.fixture(autouse=True)
def clean_sessions():
    """Каждый тест начинает с чистого списка активных сессий."""
    SESSIONS.clear()
    yield
    SESSIONS.clear()


@pytest.fixture(autouse=True)
def clean_database():
    """Тесты пишут в реальный SQLite-файл (leaderboard, user_locations),
    так что без сброса между тестами счётчики и рейтинги "текут" из
    одного теста в другой в зависимости от порядка запуска — именно
    так был найден баг с total=2 вместо total=1 в тесте на ранжирование."""
    if DB_PATH.exists():
        os.remove(DB_PATH)
    yield
    if DB_PATH.exists():
        os.remove(DB_PATH)


@pytest.fixture
def client():
    # Контекстный менеджер обязателен: он запускает FastAPI lifespan
    # (db.init_db()), иначе таблица leaderboard не будет создана.
    with TestClient(app) as test_client:
        yield test_client


def test_categories_endpoint_lists_capital_landmark_nature(client):
    res = client.get("/api/categories")
    assert res.status_code == 200
    values = {c["value"] for c in res.json()}
    assert values == {"capital", "landmark", "nature"}


def test_start_quiz_returns_session_and_first_question(client):
    res = client.post(
        "/api/quiz/start",
        json={"mode": "classic", "question_count": 3, "category": "all"},
    )
    assert res.status_code == 200
    body = res.json()
    assert "session_id" in body
    assert body["question"]["index"] == 1
    assert body["question"]["total_questions"] == 3


def test_full_classic_game_flow_reaches_finish(client):
    start = client.post(
        "/api/quiz/start",
        json={"mode": "classic", "question_count": 3, "category": "all"},
    ).json()
    session_id = start["session_id"]

    is_finished = False
    for _ in range(3):
        res = client.post(f"/api/quiz/{session_id}/answer", json={"lat": 10, "lng": 10})
        assert res.status_code == 200
        body = res.json()
        is_finished = body["is_finished"]

    assert is_finished is True


def test_hint_marks_the_answer_as_hint_used(client):
    start = client.post(
        "/api/quiz/start",
        json={"mode": "classic", "question_count": 3, "category": "all"},
    ).json()
    session_id = start["session_id"]

    client.post(f"/api/quiz/{session_id}/hint")
    res = client.post(f"/api/quiz/{session_id}/answer", json={"lat": 0, "lng": 0})

    # Регресс-тест на баг, найденный при разработке (см. AI_REFLECTION.md):
    # hint_used раньше всегда возвращался False из-за порядка операций.
    assert res.json()["hint_used"] is True


def test_answer_on_unknown_session_returns_404(client):
    res = client.post("/api/quiz/does-not-exist/answer", json={"lat": 0, "lng": 0})
    assert res.status_code == 404


def test_leaderboard_round_trip(client):
    start = client.post(
        "/api/quiz/start",
        json={"mode": "classic", "question_count": 3, "category": "all"},
    ).json()
    session_id = start["session_id"]

    for _ in range(3):
        client.post(f"/api/quiz/{session_id}/answer", json={"lat": 10, "lng": 10})

    submit = client.post(f"/api/quiz/{session_id}/leaderboard", json={"player_name": "TestPlayer"})
    assert submit.status_code == 201

    board = client.get("/api/quiz/leaderboard").json()
    assert any(entry["player_name"] == "TestPlayer" for entry in board)


def test_leaderboard_submit_returns_rank_and_total(client):
    def submit_with_score(name, score):
        start = client.post(
            "/api/quiz/start",
            json={"mode": "classic", "question_count": 3, "category": "all"},
        ).json()
        sid = start["session_id"]
        # Подставляем счёт напрямую в состояние сессии — тест проверяет
        # арифметику ранжирования в db.get_rank_and_total, а не то,
        # какие случайные вопросы выпадут и какой счёт они дадут.
        SESSIONS[sid]["score"] = score
        return client.post(f"/api/quiz/{sid}/leaderboard", json={"player_name": name}).json()

    first = submit_with_score("Alice", 4000)
    assert first == {"rank": 1, "total": 1}

    second = submit_with_score("Bob", 5000)
    assert second == {"rank": 1, "total": 2}  # Bob's score is higher -> takes 1st

    third = submit_with_score("Carol", 4000)
    assert third == {"rank": 2, "total": 3}  # ties with Alice's score -> shares 2nd, not 3rd


def test_suggested_location_merges_into_its_chosen_category(client):
    """Предложенная локация должна попадать именно в выбранную игроком
    категорию — не в отдельную "community", и не в другие темы."""
    before = {c["value"]: c["count"] for c in client.get("/api/categories").json()}

    suggestion = client.post(
        "/api/locations/suggest",
        json={"name": "Мой родной город", "category": "capital", "lat": 53.68, "lng": 23.83, "region": "Беларусь"},
    )
    assert suggestion.status_code == 201
    assert suggestion.json()["prompt"] == "Где находится Мой родной город?"

    after = {c["value"]: c["count"] for c in client.get("/api/categories").json()}
    assert after["capital"] == before["capital"] + 1
    assert after["landmark"] == before["landmark"]
    assert after["nature"] == before["nature"]

    # Новая локация реально играбельна как обычный вопрос темы "capital".
    start = client.post(
        "/api/quiz/start",
        json={"mode": "classic", "question_count": 3, "category": "capital"},
    )
    assert start.status_code == 200


def test_suggestion_with_blocked_word_is_rejected(client):
    res = client.post(
        "/api/locations/suggest",
        json={"name": "хуйгород", "category": "capital", "lat": 10, "lng": 10},
    )
    assert res.status_code == 400


def test_categories_report_live_community_count_per_category(client):
    before = next(c for c in client.get("/api/categories").json() if c["value"] == "nature")
    client.post(
        "/api/locations/suggest",
        json={"name": "Новая точка", "category": "nature", "lat": 1, "lng": 1},
    )
    after = next(c for c in client.get("/api/categories").json() if c["value"] == "nature")
    assert after["count"] == before["count"] + 1
    assert after["community_count"] == before["community_count"] + 1


def test_categories_lang_en_returns_english_labels(client):
    result = client.get("/api/categories?lang=en").json()
    labels = {c["value"]: c["label"] for c in result}
    assert labels["capital"] == "Capitals"
    assert labels["landmark"] == "Landmarks"
    assert labels["nature"] == "Nature"


def test_quiz_lang_en_returns_english_content_throughout(client):
    start = client.post(
        "/api/quiz/start",
        json={"mode": "classic", "question_count": 3, "category": "landmark", "lang": "en"},
    ).json()
    # Промпт вопроса уже на английском с самого начала сессии.
    assert start["question"]["prompt"].lower().startswith("where")

    session_id = start["session_id"]
    answer = client.post(f"/api/quiz/{session_id}/answer", json={"lat": 0, "lng": 0}).json()
    # correct_name/country — на английском, а не русский оригинал. Проверяем
    # отсутствие кириллицы, а не "только ASCII": у части английских названий
    # законно есть диакритика (например "Sagrada Família", "Brasília").
    assert not _contains_cyrillic(answer["correct_name"])
    assert not _contains_cyrillic(answer["correct_country"])


def _contains_cyrillic(text: str) -> bool:
    return any("\u0400" <= ch <= "\u04ff" for ch in text)


def test_user_submitted_location_has_no_translation_and_falls_back(client):
    """Локации от игроков не переводятся — в английской сессии видно
    исходный текст, а не пустоту и не ошибку.

    Раньше тест просил question_count равным размеру всего пула, чтобы
    гарантированно увидеть локацию игрока. Когда база выросла с 15 до
    30+ локаций в теме, это перестало работать и тест стал падать в ~45%
    запусков. Теперь детерминированно: подставляем локацию игрока как
    текущий вопрос сессии, а не надеемся на шаффл."""
    suggestion = client.post(
        "/api/locations/suggest",
        json={"name": "Несвижский замок", "category": "landmark", "lat": 53.22, "lng": 26.68, "region": "Беларусь"},
    ).json()

    start = client.post(
        "/api/quiz/start",
        json={"mode": "classic", "question_count": 3, "category": "landmark", "lang": "en"},
    ).json()
    session_id = start["session_id"]
    SESSIONS[session_id]["current_question_id"] = f"user-{suggestion['id']}"

    hint = client.post(f"/api/quiz/{session_id}/hint").json()
    assert hint["region"] == "Беларусь"

    answer = client.post(f"/api/quiz/{session_id}/answer", json={"lat": 53.22, "lng": 26.68}).json()
    assert answer["correct_name"] == "Несвижский замок"
    assert answer["distance_km"] < 1
