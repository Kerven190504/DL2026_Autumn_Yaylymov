import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../i18n.jsx";

const BLURBS = {
  all: { ru: "Полный набор — все локации вперемешку, включая те, что добавили другие игроки.", en: "The full set — every location mixed together, including ones added by other players." },
  capital: { ru: "От Парижа до Веллингтона — узнаете столицу по одной точке на карте?", en: "From Paris to Wellington — can you tell a capital from a single point on the map?" },
  landmark: { ru: "Эйфелева башня, Тадж-Махал, Мачу-Пикчу — места, которые все узнают на фото, но не все на карте.", en: "The Eiffel Tower, the Taj Mahal, Machu Picchu — places everyone recognises in a photo, not everyone on a map." },
  nature: { ru: "Каньоны, вулканы и водопады со всего света.", en: "Canyons, volcanoes and waterfalls from around the world." },
  community: { ru: "Локации, которые предложили другие игроки — тема растёт сама, без кураторов.", en: "Locations suggested by other players — this theme grows on its own, no curators involved." },
};

/*
  Раньше здесь был ручной трекинг pointerdown/move/up с setPointerCapture
  для свайпа — и он дважды приносил баги (последний раз: клики по кнопке
  "Начать игру" не долетали до неё). Нативный горизонтальный scroll со
  scroll-snap делает то же самое (свайп/драг с инерцией, привязка к
  слайду) силами браузера — на реальных touch-устройствах он просто
  работает всегда, без самодельной обработки жестов и без риска
  случайно перехватить клик по кнопке внутри слайда.
*/
export default function CategoryCarousel({ categories, mode, onStart, error }) {
  const { t, lang, plural } = useLanguage();
  const viewportRef = useRef(null);
  const [index, setIndex] = useState(0);
  const scrollTimeout = useRef(null);

  const slides = useMemo(() => {
    const total = categories.reduce((sum, c) => sum + c.count, 0);
    const list = [{ value: "all", label: t("carouselAll"), count: total }, ...categories];
    return list.map((c) => ({
      ...c,
      label: c.value === "all" ? c.label : t(`category_${c.value}`) || c.label,
      blurb: BLURBS[c.value]?.[lang] || "",
    }));
  }, [categories, lang, t]);

  const clampedIndex = Math.min(index, Math.max(slides.length - 1, 0));

  function scrollToIndex(i, smooth = true) {
    const el = viewportRef.current;
    if (!el) return;
    const target = Math.max(0, Math.min(slides.length - 1, i));
    el.scrollTo({ left: target * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  }

  function goTo(i) {
    scrollToIndex(i);
  }

  // Синхронизируем "активный" индекс (для точек) с реальной позицией
  // скролла — пользователь может долистать пальцем без клика по стрелке.
  function handleScroll() {
    const el = viewportRef.current;
    if (!el) return;
    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setIndex(i);
    }, 80);
  }

  // При смене языка/списка слайдов ширина не меняется, но на всякий
  // случай не даём индексу указывать за пределы нового списка.
  useEffect(() => {
    if (index > slides.length - 1) scrollToIndex(slides.length - 1, false);
  }, [slides.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!slides.length) return null;

  return (
    <div className="carousel">
      <div className="carousel__viewport" ref={viewportRef} onScroll={handleScroll}>
        {slides.map((slide) => (
          <div className="carousel__slide" key={slide.value}>
            <span className="carousel__count">{slide.count} {plural(slide.count, "location")}</span>
            <h2 className="carousel__label">{slide.label}</h2>
            <p className="carousel__blurb">{slide.blurb}</p>
            <button
              type="button"
              className="btn btn--primary btn--large"
              onClick={() => onStart(mode, slide.value)}
            >
              {t("startGame")}
            </button>
          </div>
        ))}
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="carousel__nav">
        <button
          type="button"
          className="carousel__arrow"
          onClick={() => goTo(clampedIndex - 1)}
          disabled={clampedIndex === 0}
          aria-label={t("prevTheme")}
        >
          ←
        </button>
        <div className="carousel__dots">
          {slides.map((slide, i) => (
            <button
              key={slide.value}
              type="button"
              className={`carousel__dot ${i === clampedIndex ? "carousel__dot--active" : ""}`}
              onClick={() => goTo(i)}
              aria-label={slide.label}
            />
          ))}
        </div>
        <button
          type="button"
          className="carousel__arrow"
          onClick={() => goTo(clampedIndex + 1)}
          disabled={clampedIndex === slides.length - 1}
          aria-label={t("nextTheme")}
        >
          →
        </button>
      </div>
    </div>
  );
}
