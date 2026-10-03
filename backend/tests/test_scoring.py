"""
Тесты для scoring.py.

Сделаны через pytest.mark.parametrize вместо нескольких похожих
test_score_case_1 / test_score_case_2 / ... — иначе это ровно тот
антипаттерн (копипаст похожих тестов), о котором говорит Никита
Соболев в выступлении "Качество тестов": копия-вставка тестов вместо
параметризации усложняет поддержку и прячет реальное покрытие.
"""
import math

import pytest

from scoring import haversine_km, calculate_score, MAX_SCORE


def test_haversine_zero_distance_for_same_point():
    assert haversine_km(48.8566, 2.3522, 48.8566, 2.3522) == pytest.approx(0, abs=1e-6)


def test_haversine_is_symmetric():
    a = (48.8566, 2.3522)  # Париж
    b = (51.5074, -0.1278)  # Лондон
    assert haversine_km(*a, *b) == pytest.approx(haversine_km(*b, *a))


def test_haversine_known_paris_london_distance():
    # Реальное расстояние Париж — Лондон ~344 км по прямой.
    distance = haversine_km(48.8566, 2.3522, 51.5074, -0.1278)
    assert 330 < distance < 360


@pytest.mark.parametrize(
    "distance_km,hint_used,expected_relation",
    [
        (0, False, "max"),        # точное попадание -> максимум очков
        (1, False, "near_max"),   # почти точное попадание -> почти максимум
        (20000, False, "near_zero"),  # другой конец Земли -> около нуля
    ],
)
def test_score_decreases_with_distance(distance_km, hint_used, expected_relation):
    score = calculate_score(distance_km, hint_used=hint_used)
    if expected_relation == "max":
        assert score == MAX_SCORE
    elif expected_relation == "near_max":
        assert score > MAX_SCORE * 0.9
    elif expected_relation == "near_zero":
        assert score < MAX_SCORE * 0.01


def test_hint_penalty_reduces_score_at_same_distance():
    distance_km = 200
    without_hint = calculate_score(distance_km, hint_used=False)
    with_hint = calculate_score(distance_km, hint_used=True)
    assert with_hint < without_hint
    # штраф фиксированный (x0.7), а не случайный
    assert with_hint == pytest.approx(without_hint * 0.7, abs=1)


def test_score_never_negative_for_huge_distance():
    # Половина окружности Земли ~ 20000 км — экстремальный, но валидный случай.
    assert calculate_score(20037, hint_used=True) >= 0
