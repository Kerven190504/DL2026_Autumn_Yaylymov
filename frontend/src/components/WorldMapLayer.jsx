import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

/*
  Переписано с нуля: раньше карта рисовалась из собственного GeoJSON
  (силуэт суши / границы + плоская заливка или CSS-градиент "под
  рельеф"). Результат выглядел плоско и дёшево по сравнению с тем, как
  выглядит настоящая тайловая карта (см. скриншоты официального демо
  Leaflet — один и тот же непрерывный слой на любом масштабе: море,
  границы+подписи, физический рельеф). Плюс у векторного слоя был
  баг с "швами" (Leaflet считает границы SVG-рендерера один раз при
  инициализации, а наш контейнер ещё довёрстывается CSS-гридом).

  Теперь — настоящие растровые тайлы Esri (публичный REST, без
  API-ключа, тот же старый добрый arcgisonline.com, которым уже
  пользовались для Dark_Gray_Base):
    - World_Physical_Map — натуральная физическая карта (рельеф,
      растительность), БЕЗ единой подписи и без политических границ.
      Основа для всех трёх тем — это и есть "красивая физическая карта"
      с скриншота.
    - Reference/World_Boundaries_and_Places_Alternate — официально
      документирован Esri как прозрачная подложка ИМЕННО для показа
      поверх физической карты: границы стран + подписи городов/стран
      на прозрачном фоне.

  Кто что показывает:
  - capitals: только физическая карта, без оверлея. Название города —
    прямая подсказка ответа, поэтому здесь карта максимально "немая".
  - landmarks / nature: физическая карта + оверлей с границами и
    подписями. Знание "это Франция" или "это рядом с Каиром" не
    выдаёт конкретный памятник/объект напрямую, зато даёт систему
    координат — ровно тот обучающий эффект, о котором просили.
*/
const PHYSICAL_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}";
const BOUNDARIES_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places_Alternate/MapServer/tile/{z}/{y}/{x}";
const ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com/">Esri</a> — Source: Esri, DeLorme, HERE, Garmin, NPS';

// Дальше этого зума у Esri нет кэшированных тайлов физической карты —
// maxNativeZoom останавливает подгрузку новых тайлов и просто
// масштабирует последний имеющийся, а не показывает пустоту.
const MAX_NATIVE_ZOOM = 8;

export default function WorldMapLayer({ mapStyle = "capitals" }) {
  const map = useMap();
  const layersRef = useRef([]);

  useEffect(() => {
    const layers = [
      L.tileLayer(PHYSICAL_URL, { attribution: ATTRIBUTION, maxNativeZoom: MAX_NATIVE_ZOOM }).addTo(map),
    ];

    if (mapStyle === "landmarks" || mapStyle === "nature") {
      layers.push(L.tileLayer(BOUNDARIES_URL, { maxNativeZoom: MAX_NATIVE_ZOOM }).addTo(map));
    }

    layersRef.current = layers;
    return () => layers.forEach((l) => l.remove());
  }, [map, mapStyle]);

  return null;
}
