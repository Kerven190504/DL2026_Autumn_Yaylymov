import { useState } from "react";
import { useLanguage } from "../i18n.jsx";
import Modal from "./Modal.jsx";
import PickMap from "./PickMap.jsx";
import { api } from "../api.js";

const CATEGORY_OPTIONS = ["capital", "landmark", "nature"];

export default function SuggestLocationModal({ onClose, onSuggested }) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("capital");
  const [region, setRegion] = useState("");
  const [point, setPoint] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const canSubmit = name.trim().length >= 2 && point && !submitting;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.suggestLocation({
        name: name.trim(),
        category,
        lat: point.lat,
        lng: point.lng,
        region: region.trim(),
      });
      setDone(true);
      onSuggested?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={t("suggestTitle")} onClose={onClose}>
      {done ? (
        <div className="suggest-form__done">
          <p>{t("suggestDoneText")}</p>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            {t("suggestDoneButton")}
          </button>
        </div>
      ) : (
        <form className="suggest-form" onSubmit={handleSubmit}>
          <label className="suggest-form__field">
            <span>{t("suggestName")}</span>
            <input
              className="text-input"
              value={name}
              maxLength={60}
              placeholder={t("suggestNamePlaceholder")}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <div className="suggest-form__field">
            <span>{t("suggestCategoryLabel")}</span>
            <div className="option-row option-row--compact">
              {CATEGORY_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`option-pill option-pill--sm ${category === value ? "option-pill--active" : ""}`}
                  onClick={() => setCategory(value)}
                >
                  <strong>{t(`category_${value}`)}</strong>
                </button>
              ))}
            </div>
          </div>

          <label className="suggest-form__field">
            <span>{t("suggestRegion")}</span>
            <input
              className="text-input"
              value={region}
              maxLength={60}
              placeholder={t("suggestRegionPlaceholder")}
              onChange={(e) => setRegion(e.target.value)}
            />
          </label>

          <div className="suggest-form__field">
            <span>{t("suggestMapLabel")}</span>
            <div className="suggest-form__map">
              <PickMap point={point} onPick={(lat, lng) => setPoint({ lat, lng })} />
            </div>
            <p className="suggest-form__coords">
              {point ? `${point.lat.toFixed(3)}, ${point.lng.toFixed(3)}` : t("suggestNoPoint")}
            </p>
          </div>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn btn--primary btn--large" disabled={!canSubmit}>
            {submitting ? t("suggestSubmitting") : t("suggestSubmit")}
          </button>
        </form>
      )}
    </Modal>
  );
}
