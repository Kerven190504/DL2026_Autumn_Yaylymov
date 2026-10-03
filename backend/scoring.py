"""
Логика подсчёта очков.

Идея (как в геовикторинах вроде GeoGuessr): чем ближе клик игрока
к правильной точке, тем больше очков, по экспоненциально убывающей
кривой — попадание "почти точно" даёт заметно больше, чем попадание
"в нужную страну".
"""
import math

MAX_SCORE = 5000
# "Масштаб" убывания очков в километрах: на этом расстоянии счёт
# падает примерно в e раз. Подобран так, чтобы промах на весь
# соседний континент давал мало очков, а попадание в пределах
# одной страны — всё ещё много.
DECAY_KM = 1500
HINT_PENALTY_MULTIPLIER = 0.7  # если игрок берёт подсказку, макс. очки за вопрос x0.7

EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Расстояние по большому кругу между двумя точками на сфере (км)."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def calculate_score(distance_km: float, hint_used: bool = False) -> int:
    """Экспоненциальное убывание очков с расстоянием, 0..MAX_SCORE."""
    raw = MAX_SCORE * math.exp(-distance_km / DECAY_KM)
    if hint_used:
        raw *= HINT_PENALTY_MULTIPLIER
    return max(0, round(raw))
