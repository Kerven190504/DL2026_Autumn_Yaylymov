import { useLanguage } from "../i18n.jsx";

export default function ResultPanel({ result, onNext }) {
  const { t, lang } = useLanguage();
  return (
    <div className="result-panel">
      <p className="result-panel__distance">
        {t("missLabel")} <strong>{formatDistance(result.distance_km, lang, t)}</strong>
      </p>
      <p className="result-panel__correct">
        {t("correctLabel")} {result.correct_name}
        {result.correct_country ? `, ${result.correct_country}` : ""}
      </p>
      {result.correct_fact && <p className="result-panel__fact">{result.correct_fact}</p>}
      <p className="result-panel__score">
        +{result.score} {t("pointsSuffix")}
      </p>
      <button type="button" className="btn btn--primary btn--large" onClick={onNext}>
        {result.is_finished ? t("seeResults") : t("nextQuestion")}
      </button>
    </div>
  );
}

function formatDistance(km, lang, t) {
  const unit = lang === "en" ? "km" : "км";
  const locale = lang === "en" ? "en-US" : "ru-RU";
  if (km < 1) return t("kmLessThanOne");
  if (km < 10) return `${km.toFixed(1)} ${unit}`;
  return `${Math.round(km).toLocaleString(locale)} ${unit}`;
}
