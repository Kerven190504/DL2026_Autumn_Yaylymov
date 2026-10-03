from typing import Literal, Optional
from pydantic import BaseModel, Field


class StartQuizRequest(BaseModel):
    mode: Literal["classic", "endless"] = "classic"
    question_count: int = Field(default=10, ge=3, le=20)
    category: Literal["all", "capital", "landmark", "nature"] = "all"
    lang: Literal["ru", "en"] = "ru"


class QuestionOut(BaseModel):
    question_id: str
    prompt: str
    category: str
    index: int  # 1-based номер вопроса в игре
    total_questions: Optional[int]  # None для режима "endless"


class StartQuizResponse(BaseModel):
    session_id: str
    question: QuestionOut


class AnswerRequest(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class AnswerResponse(BaseModel):
    distance_km: float
    score: int
    total_score: int
    correct_name: str
    correct_lat: float
    correct_lng: float
    correct_country: str = ""
    correct_fact: str = ""
    hint_used: bool
    is_finished: bool
    next_question: Optional[QuestionOut]


class HintResponse(BaseModel):
    region: str
    penalty_applied: bool


class LeaderboardEntryIn(BaseModel):
    player_name: str = Field(min_length=1, max_length=30)


class LeaderboardSubmitResponse(BaseModel):
    rank: int
    total: int


class LeaderboardEntryOut(BaseModel):
    player_name: str
    score: int
    questions_count: int
    mode: str
    created_at: str


class SuggestLocationRequest(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    category: Literal["capital", "landmark", "nature"]
    prompt: str = Field(default="", max_length=140)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    region: str = Field(default="", max_length=60)


class SuggestLocationResponse(BaseModel):
    id: int
    prompt: str


class CategoryOut(BaseModel):
    value: str
    label: str
    count: int
    community_count: int = 0
