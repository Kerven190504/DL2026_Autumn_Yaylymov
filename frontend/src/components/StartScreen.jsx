import { useState } from "react";
import { useLanguage } from "../i18n.jsx";
import GlobeHero from "./GlobeHero.jsx";
import CategoryCarousel from "./CategoryCarousel.jsx";
import SuggestLocationModal from "./SuggestLocationModal.jsx";
import LeaderboardModal from "./LeaderboardModal.jsx";

export default function StartScreen({ categories, onStart, error, onCategoriesChanged }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState("classic");
  const [modal, setModal] = useState(null); // null | "suggest" | "leaderboard"

  const MODES = [
    { value: "classic", label: t("modeClassic"), hint: t("modeClassicHint") },
    { value: "endless", label: t("modeEndless"), hint: t("modeEndlessHint") },
  ];

  const totalLocations = categories.reduce((sum, c) => sum + c.count, 0);
  const suggestedCount = categories.reduce((sum, c) => sum + (c.community_count || 0), 0);

  return (
    <div className="start-screen-grid">
      <div className="start-screen">
        <p className="start-screen__eyebrow">{t("startEyebrow")}</p>
        <h1 className="start-screen__title">{t("startTitle")}</h1>
        <p className="start-screen__lede">{t("startLede")}</p>

        <div className="stats-strip">
          <div className="stats-strip__item">
            <strong>{totalLocations || "100+"}</strong>
            <span>{t("statLocations")}</span>
          </div>
          <div className="stats-strip__item">
            <strong>{suggestedCount}</strong>
            <span>{t("statSuggested")}</span>
          </div>
        </div>

        <div className="start-screen__section">
          <span className="start-screen__label">{t("modeLabel")}</span>
          <div className="option-row">
            {MODES.map((m) => (
              <button
                key={m.value}
                className={`option-pill ${mode === m.value ? "option-pill--active" : ""}`}
                onClick={() => setMode(m.value)}
                type="button"
              >
                <strong>{m.label}</strong>
                <span>{m.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="start-screen__actions-row">
          <button type="button" className="link-btn" onClick={() => setModal("suggest")}>
            {t("suggestLocationLink")}
          </button>
          <button type="button" className="link-btn" onClick={() => setModal("leaderboard")}>
            {t("leaderboardLink")}
          </button>
        </div>
      </div>

      <div className="start-screen__preview">
        <GlobeHero />
        <p className="preview-caption">{t("globeCaption", totalLocations || "100+")}</p>
      </div>

      <div className="carousel-section">
        <span className="start-screen__label">{t("thematicLabel")}</span>
        <CategoryCarousel categories={categories} mode={mode} onStart={onStart} error={error} />
      </div>

      {modal === "suggest" && (
        <SuggestLocationModal onClose={() => setModal(null)} onSuggested={onCategoriesChanged} />
      )}
      {modal === "leaderboard" && <LeaderboardModal onClose={() => setModal(null)} />}
    </div>
  );
}
