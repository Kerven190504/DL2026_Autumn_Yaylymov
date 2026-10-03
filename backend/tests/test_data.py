"""
Тесты целостности набора локаций (data.py).

База выросла с 31 до 100+ записей, набранных вручную на двух языках —
глазами такое не проверить. Эти тесты ловят то, что реально ломается
при ручном вводе: дубли id, забытый перевод, координаты вне диапазона
и "мёртвые" вопросы, у которых две точки-ответа почти совпадают.
"""
import math
import re
from collections import Counter

import pytest

from data import LOCATIONS, CATEGORIES, CATEGORY_LABELS, get_localized

BASE_FIELDS = ["id", "category", "name", "name_en", "prompt", "prompt_en", "lat", "lng", "region", "region_en"]
EXTRA_FIELDS = ["country", "country_en", "fact", "fact_en"]  # у достопримечательностей и природы


def _distance_km(a, b):
    r = 6371.0
    p1, p2 = math.radians(a["lat"]), math.radians(b["lat"])
    dphi = p2 - p1
    dlam = math.radians(b["lng"] - a["lng"])
    h = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlam / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def test_dataset_has_at_least_100_locations():
    assert len(LOCATIONS) >= 100


def test_every_category_has_enough_locations_for_a_full_round():
    counts = Counter(loc["category"] for loc in LOCATIONS)
    for cat in CATEGORIES:
        assert counts[cat] >= 20, f"в теме {cat} слишком мало локаций для партии"


def test_ids_are_unique_and_well_formed():
    ids = [loc["id"] for loc in LOCATIONS]
    assert len(ids) == len(set(ids))
    for loc_id in ids:
        # cap-paris, land-eiffel, nat-fuji — префикс темы + латинский слаг
        assert re.fullmatch(r"(cap|land|nat)-[a-z]+", loc_id), f"странный id: {loc_id}"


@pytest.mark.parametrize("loc", LOCATIONS, ids=lambda loc: loc["id"])
def test_location_has_all_required_fields_in_both_languages(loc):
    required = BASE_FIELDS + (EXTRA_FIELDS if loc["category"] in ("landmark", "nature") else [])
    for field in required:
        assert loc.get(field) not in (None, ""), f"{loc['id']}: пустое поле {field}"


@pytest.mark.parametrize("loc", LOCATIONS, ids=lambda loc: loc["id"])
def test_coordinates_are_valid(loc):
    assert -90 <= loc["lat"] <= 90
    assert -180 <= loc["lng"] <= 180


@pytest.mark.parametrize("loc", LOCATIONS, ids=lambda loc: loc["id"])
def test_english_text_is_not_left_in_russian(loc):
    """Забытый перевод выглядит как английское поле, в котором кириллица."""
    for field in ("name_en", "prompt_en", "region_en", "country_en", "fact_en"):
        text = loc.get(field, "")
        assert not re.search(r"[\u0400-\u04ff]", text), f"{loc['id']}.{field} содержит кириллицу"


def test_no_two_locations_in_one_theme_share_an_answer_point():
    """Два вопроса в одной теме с ответами в 30 км друг от друга — это
    бесплатные 5000 очков и ноль пользы (были найдены Лувр рядом с
    Эйфелевой башней и Голубая мечеть рядом с Айя-Софией)."""
    by_cat = {}
    for loc in LOCATIONS:
        by_cat.setdefault(loc["category"], []).append(loc)
    for cat, locs in by_cat.items():
        for i, a in enumerate(locs):
            for b in locs[i + 1:]:
                assert _distance_km(a, b) >= 30, f"{a['id']} и {b['id']} ({cat}) слишком близко"


def test_category_labels_exist_in_both_languages():
    for cat in CATEGORIES:
        assert CATEGORY_LABELS[cat]["ru"]
        assert CATEGORY_LABELS[cat]["en"]


def test_get_localized_falls_back_to_russian_when_no_translation():
    user_loc = {"name": "Несвижский замок", "prompt": "Где находится Несвижский замок?"}
    assert get_localized(user_loc, "name", "en") == "Несвижский замок"
    assert get_localized(user_loc, "fact", "en") == ""
