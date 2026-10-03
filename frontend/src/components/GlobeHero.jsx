import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";

// Тот же тизер-набор локаций, что и раньше, просто теперь они —
// светящиеся точки на настоящем вращаемом 3D-глобусе вместо плоской
// 2D-карты. Чисто декоративный слой на стартовом экране, не часть
// игровой логики (та использует QuizMap.jsx и настоящий backend).
const TEASER_LOCATIONS = [
  { name: "Эйфелева башня", lat: 48.8584, lng: 2.2945 },
  { name: "Тадж-Махал", lat: 27.1751, lng: 78.0421 },
  { name: "Сиднейский оперный театр", lat: -33.8568, lng: 151.2153 },
  { name: "Мачу-Пикчу", lat: -13.1631, lng: -72.5450 },
  { name: "Пирамиды Гизы", lat: 29.9792, lng: 31.1342 },
  { name: "Статуя Свободы", lat: 40.6892, lng: -74.0445 },
  { name: "Гора Фудзи", lat: 35.3606, lng: 138.7274 },
  { name: "Христос-Искупитель", lat: -22.9519, lng: -43.2105 },
];

let ringId = 0;

export default function GlobeHero() {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  // null, не 400x400: рендерим Globe только после первого реального
  // замера контейнера — иначе на узких телефонных экранах один кадр
  // рисуется по дефолтным 400px и визуально "дёргается"/обрезается.
  const [size, setSize] = useState(null);
  const [rings, setRings] = useState([]);

  // Globe.gl требует конкретные пиксельные width/height, а не "100%" —
  // подстраиваемся под размер родительской карточки через ResizeObserver.
  // useLayoutEffect (не useEffect), чтобы замер и установка размера
  // произошли до отрисовки кадра на экране.
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Автовращение + стартовый угол обзора.
  useEffect(() => {
    if (!globeRef.current || !size) return;
    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.enableZoom = false;
    globeRef.current.pointOfView({ lat: 20, lng: 15, altitude: 2.2 }, 0);
  }, [size]);

  function handleGlobeClick({ lat, lng }) {
    const id = ringId++;
    setRings((prev) => [...prev, { id, lat, lng }]);
    // Убираем кольцо после того, как рябь визуально затухнет.
    setTimeout(() => {
      setRings((prev) => prev.filter((r) => r.id !== id));
    }, 2200);
  }

  return (
    <div className="globe-hero" ref={containerRef}>
      {size && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
        atmosphereColor="#2997ff"
        atmosphereAltitude={0.22}
        pointsData={TEASER_LOCATIONS}
        pointLat="lat"
        pointLng="lng"
        pointColor={() => "#2997ff"}
        pointAltitude={0.01}
        pointRadius={0.35}
        pointLabel={(d) => d.name}
        ringsData={rings}
        ringLat="lat"
        ringLng="lng"
        ringColor={() => (t) => `rgba(41, 151, 255, ${1 - t})`}
        ringMaxRadius={6}
        ringPropagationSpeed={4}
        ringRepeatPeriod={2200}
          onGlobeClick={handleGlobeClick}
          onPointClick={(point) => handleGlobeClick(point)}
        />
      )}
    </div>
  );
}
