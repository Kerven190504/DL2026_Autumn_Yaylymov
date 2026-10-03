"""
Географическая викторина — бэкенд на FastAPI.

Игровые сессии хранятся в памяти процесса (SESSIONS): для учебного
проекта с одним инстансом сервера это проще и надёжнее, чем тащить
через SQLite ещё и быстро меняющееся игровое состояние. Таблица
лидеров и пользовательские локации, наоборот, обязаны переживать
перезапуски — они в SQLite (см. db.py).
"""
import random
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import db
from data import LOCATIONS, get_locations_by_category, get_localized, CATEGORIES, CATEGORY_LABELS
from moderation import contains_blocked_terms
from models import (
    StartQuizRequest, StartQuizResponse, QuestionOut,
    AnswerRequest, AnswerResponse,
    HintResponse, LeaderboardEntryIn, LeaderboardEntryOut, LeaderboardSubmitResponse,
    SuggestLocationRequest, SuggestLocationResponse, CategoryOut,
)
from scoring import haversine_km, calculate_score

LOCATIONS_BY_ID = {loc["id"]: loc for loc in LOCATIONS}

# session_id -> состояние игры (см. docs/design.md, раздел "Модель данных")
SESSIONS: dict[str, dict] = {}

USER_LOCATION_PREFIX = "user-"


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="Geo Quiz API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # учебный проект: фронтенд может быть на любом localhost-порту
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_location(question_id: str) -> dict:
    """Достаёт локацию из встроенного набора ИЛИ из пользовательских
    (id вида "user-<db_id>"). Единая точка правды вместо двух путей
    в каждом эндпоинте — иначе легко забыть один из них при правках.

    У предложенных игроками локаций своя настоящая категория (та, что
    выбрал сам игрок при отправке) — они не живут в отдельном "прочем",
    а подмешиваются прямо в capital/landmark/nature (см. db.py)."""
    if question_id.startswith(USER_LOCATION_PREFIX):
        db_id = int(question_id[len(USER_LOCATION_PREFIX):])
        row = db.get_user_location_by_id(db_id)
        if row is None:
            raise HTTPException(404, "Локация игрока больше не существует")
        return {**row, "country": "", "fact": ""}
    return LOCATIONS_BY_ID[question_id]


def _pick_question_pool(category: str) -> list[str]:
    if not category or category == "all":
        static_ids = [loc["id"] for loc in LOCATIONS]
        user_ids = [f"{USER_LOCATION_PREFIX}{row['id']}" for row in db.get_user_locations()]
    else:
        static_ids = [loc["id"] for loc in get_locations_by_category(category)]
        user_ids = [f"{USER_LOCATION_PREFIX}{row['id']}" for row in db.get_user_locations(category)]
    pool = static_ids + user_ids
    random.shuffle(pool)
    return pool


def _build_question_out(session_id: str) -> QuestionOut:
    session = SESSIONS[session_id]
    question_id = session["current_question_id"]
    loc = _get_location(question_id)
    return QuestionOut(
        question_id=question_id,
        prompt=get_localized(loc, "prompt", session["lang"]),
        category=loc["category"],
        index=session["answered_count"] + 1,
        total_questions=session["total_questions"],
    )


def _advance_to_next_question(session_id: str) -> bool:
    """Выбирает следующий вопрос. Возвращает False, если игра окончена."""
    session = SESSIONS[session_id]

    if session["mode"] == "classic":
        if session["answered_count"] >= session["total_questions"]:
            return False
        next_id = session["remaining_pool"].pop()
    else:  # endless — колода не кончается, при исчерпании тасуем заново
        if not session["remaining_pool"]:
            session["remaining_pool"] = _pick_question_pool(session["category"])
        next_id = session["remaining_pool"].pop()

    session["current_question_id"] = next_id
    session["hint_used_current"] = False
    return True


@app.get("/api/categories", response_model=list[CategoryOut])
def list_categories(lang: str = "ru"):
    community_counts = db.count_user_locations_by_category()
    result = []
    for cat in CATEGORIES:
        curated = len(get_locations_by_category(cat))
        community = community_counts.get(cat, 0)
        label = CATEGORY_LABELS[cat].get(lang, CATEGORY_LABELS[cat]["ru"])
        result.append(CategoryOut(
            value=cat, label=label,
            count=curated + community, community_count=community,
        ))
    return result


@app.post("/api/quiz/start", response_model=StartQuizResponse)
def start_quiz(payload: StartQuizRequest):
    pool = _pick_question_pool(payload.category)
    if len(pool) < 3:
        raise HTTPException(400, "Недостаточно вопросов для выбранной категории")

    session_id = str(uuid.uuid4())
    total = payload.question_count if payload.mode == "classic" else None

    SESSIONS[session_id] = {
        "mode": payload.mode,
        "category": payload.category,
        "lang": payload.lang,
        "remaining_pool": pool,
        "current_question_id": None,
        "answered_count": 0,
        "total_questions": total,
        "score": 0,
        "hint_used_current": False,
    }
    _advance_to_next_question(session_id)

    return StartQuizResponse(
        session_id=session_id,
        question=_build_question_out(session_id),
    )


@app.post("/api/quiz/{session_id}/hint", response_model=HintResponse)
def use_hint(session_id: str):
    session = _get_session_or_404(session_id)
    session["hint_used_current"] = True
    loc = _get_location(session["current_question_id"])
    region = get_localized(loc, "region", session["lang"])
    fallback = "unknown" if session["lang"] == "en" else "неизвестен"
    return HintResponse(region=region or fallback, penalty_applied=True)


@app.post("/api/quiz/{session_id}/answer", response_model=AnswerResponse)
def submit_answer(session_id: str, payload: AnswerRequest):
    session = _get_session_or_404(session_id)
    loc = _get_location(session["current_question_id"])
    lang = session["lang"]

    hint_used_for_answer = session["hint_used_current"]
    distance_km = haversine_km(payload.lat, payload.lng, loc["lat"], loc["lng"])
    score = calculate_score(distance_km, hint_used=hint_used_for_answer)

    session["score"] += score
    session["answered_count"] += 1

    has_next = _advance_to_next_question(session_id)

    return AnswerResponse(
        distance_km=round(distance_km, 1),
        score=score,
        total_score=session["score"],
        correct_name=get_localized(loc, "name", lang),
        correct_lat=loc["lat"],
        correct_lng=loc["lng"],
        correct_country=get_localized(loc, "country", lang),
        correct_fact=get_localized(loc, "fact", lang),
        hint_used=hint_used_for_answer,
        is_finished=not has_next,
        next_question=_build_question_out(session_id) if has_next else None,
    )


@app.get("/api/quiz/leaderboard", response_model=list[LeaderboardEntryOut])
def get_leaderboard(limit: int = 20):
    return db.get_top_scores(limit=limit)


@app.post("/api/quiz/{session_id}/leaderboard", response_model=LeaderboardSubmitResponse, status_code=201)
def post_leaderboard_entry(session_id: str, payload: LeaderboardEntryIn):
    session = _get_session_or_404(session_id)
    db.add_leaderboard_entry(
        player_name=payload.player_name.strip()[:30],
        score=session["score"],
        questions_count=session["answered_count"],
        mode=session["mode"],
    )
    rank, total = db.get_rank_and_total(session["score"])
    return LeaderboardSubmitResponse(rank=rank, total=total)


@app.post("/api/locations/suggest", response_model=SuggestLocationResponse, status_code=201)
def suggest_location(payload: SuggestLocationRequest):
    """Игрок предлагает свою локацию и сам выбирает её тему — она
    сразу попадает в игру как часть этой темы (см. db.py). Базовая
    проверка на явный треш — см. moderation.py; это не полноценная
    модерация, честно описано как ограничение в README.md."""
    name = payload.name.strip()
    region = payload.region.strip()

    if contains_blocked_terms(name, region):
        raise HTTPException(400, "Название или регион содержат недопустимые слова")

    prompt = payload.prompt.strip() or f"Где находится {name}?"

    new_id = db.add_user_location(
        name=name, prompt=prompt, category=payload.category,
        lat=payload.lat, lng=payload.lng, region=region,
    )
    return SuggestLocationResponse(id=new_id, prompt=prompt)


def _get_session_or_404(session_id: str) -> dict:
    session = SESSIONS.get(session_id)
    if session is None:
        raise HTTPException(404, "Сессия не найдена или истекла")
    return session
