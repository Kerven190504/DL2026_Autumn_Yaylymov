"""
Минимальный слой работы с SQLite.

Для игровых сессий используется оперативная память процесса (см.
app.py, SESSIONS) — они недолговечны и не обязаны переживать
перезапуск сервера. А таблицы ниже должны сохраняться между
запусками, поэтому они в SQLite-файле:

- leaderboard — результаты партий;
- user_locations — локации, предложенные игроками (см. design.md).
  У каждой явно указана категория (capital/landmark/nature) — та же
  подающий сам выбирает при отправке, и локация встраивается прямо в
  соответствующую тему, а не живёт в отдельном непонятном "прочее".
  Базовая проверка на явный треш — см. moderation.py.
"""
import sqlite3
from pathlib import Path
from contextlib import contextmanager

DB_PATH = Path(__file__).parent / "geo_quiz.db"


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS leaderboard (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_name TEXT NOT NULL,
                score INTEGER NOT NULL,
                questions_count INTEGER NOT NULL,
                mode TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_locations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                prompt TEXT NOT NULL,
                category TEXT NOT NULL,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                region TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        conn.commit()


@contextmanager
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


# ---------- Leaderboard ----------

def add_leaderboard_entry(player_name: str, score: int, questions_count: int, mode: str) -> None:
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO leaderboard (player_name, score, questions_count, mode) VALUES (?, ?, ?, ?)",
            (player_name, score, questions_count, mode),
        )
        conn.commit()


def get_top_scores(limit: int = 20):
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT player_name, score, questions_count, mode, created_at "
            "FROM leaderboard ORDER BY score DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(row) for row in rows]


def get_rank_and_total(score: int) -> tuple[int, int]:
    """Место игрока (1 = лучший результат) и общее число записей.

    Место считается как "число результатов строго лучше этого" + 1,
    чтобы одинаковые очки честно делили одно место, а не расходились
    по порядку вставки.
    """
    with get_connection() as conn:
        better = conn.execute(
            "SELECT COUNT(*) FROM leaderboard WHERE score > ?", (score,)
        ).fetchone()[0]
        total = conn.execute("SELECT COUNT(*) FROM leaderboard").fetchone()[0]
        return better + 1, total


# ---------- User-suggested locations ----------

def add_user_location(name: str, prompt: str, category: str, lat: float, lng: float, region: str) -> int:
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO user_locations (name, prompt, category, lat, lng, region) VALUES (?, ?, ?, ?, ?, ?)",
            (name, prompt, category, lat, lng, region),
        )
        conn.commit()
        return cursor.lastrowid


def get_user_locations(category: str | None = None):
    with get_connection() as conn:
        if category:
            rows = conn.execute(
                "SELECT id, name, prompt, category, lat, lng, region FROM user_locations WHERE category = ?",
                (category,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT id, name, prompt, category, lat, lng, region FROM user_locations"
            ).fetchall()
        return [dict(row) for row in rows]


def get_user_location_by_id(location_id: int):
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, name, prompt, category, lat, lng, region FROM user_locations WHERE id = ?",
            (location_id,),
        ).fetchone()
        return dict(row) if row else None


def count_user_locations_by_category() -> dict[str, int]:
    """{category: count} для всех категорий, в которых есть хоть одна
    предложенная игроками локация — используется, чтобы приплюсовать
    их к счётчикам в /api/categories."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT category, COUNT(*) as n FROM user_locations GROUP BY category"
        ).fetchall()
        return {row["category"]: row["n"] for row in rows}
