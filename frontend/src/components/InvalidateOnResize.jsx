import { useEffect } from "react";
import { useMap } from "react-leaflet";

/*
  Баг, который это чинит: Leaflet считает свои внутренние размеры
  (renderer bounds для GeoJSON/SVG-слоя) один раз, в момент
  инициализации карты — по фактическому размеру контейнера НА ТОТ
  МОМЕНТ. Наш контейнер лежит в CSS grid/flex и получает финальный
  размер уже ПОСЛЕ первого рендера (шрифты, раскладка карточек) —
  из-за этого рендерер остаётся обрезан по старым (обычно меньшим)
  границам, и там, где заканчивалась старая граница, остаётся
  заметная линия-шов, а материк дальше просто не дорисовывается.
  Формально это конкретно то, что видно на скриншотах — горизонтальные
  полосы у верхнего края карты.

  Фикс — на каждое изменение размера контейнера явно звать
  map.invalidateSize(), чтобы Leaflet пересчитал размеры и перерисовал
  слои под актуальный размер.
*/
export default function InvalidateOnResize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();

    // Сразу после монтирования — на случай, если шрифты/раскладка
    // уже успели сдвинуть размер к этому моменту.
    map.invalidateSize();

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}
