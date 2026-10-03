import { useEffect, useRef } from "react";

/*
  Декоративный анимированный фон вместо плоской заливки — несколько
  размытых цветовых пятен, которые медленно дрейфуют и слегка
  реагируют на движение курсора (параллакс через CSS custom
  properties). Без внешних изображений: не требует лицензий или
  ссылок на атрибуцию, и остаётся на месте, даже если пользователь
  открыл страницу офлайн после сборки.
*/
export default function AuroraBackground() {
  const ref = useRef(null);

  useEffect(() => {
    function handleMove(e) {
      if (!ref.current) return;
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      ref.current.style.setProperty("--px", x.toFixed(3));
      ref.current.style.setProperty("--py", y.toFixed(3));
    }
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  return (
    <div className="aurora-bg" ref={ref} aria-hidden="true">
      <span className="aurora-blob aurora-blob--a" />
      <span className="aurora-blob aurora-blob--b" />
      <span className="aurora-blob aurora-blob--c" />
      <div className="aurora-grain" />
    </div>
  );
}
