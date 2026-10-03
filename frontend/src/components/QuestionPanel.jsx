import { useLanguage } from "../i18n.jsx";

export default function QuestionPanel({
  question,
  totalScore,
  timeLeft,
  maxTime,
  hintRegion,
  onUseHint,
  hintUsed,
  hasGuess,
  onConfirm,
}) {
  const { t } = useLanguage();
  const timePct = Math.max(0, Math.min(100, (timeLeft / maxTime) * 100));
  const progressLabel = t("questionProgress", question.index, question.total_questions);

  return (
    <div className="question-panel">
      <div className="question-panel__top">
        <span className="question-panel__progress">{progressLabel}</span>
        <span className="question-panel__score">
          {totalScore} {t("questionScoreSuffix")}
        </span>
      </div>

      <h2 className="question-panel__prompt">{question.prompt}</h2>

      <div className="timer-bar">
        <div className="timer-bar__fill" style={{ width: `${timePct}%` }} />
      </div>

      {hintRegion && (
        <p className="question-panel__hint">
          {t("hintRegionPrefix")} {hintRegion}
        </p>
      )}

      <div className="question-panel__actions">
        <button type="button" className="btn btn--ghost" onClick={onUseHint} disabled={hintUsed}>
          {hintUsed ? t("hintUsedButton") : t("hintButton")}
        </button>
        <button type="button" className="btn btn--primary" onClick={onConfirm} disabled={!hasGuess}>
          {t("confirmButton")}
        </button>
      </div>

      <p className="question-panel__tip">{hasGuess ? t("tipHasGuess") : t("tipNoGuess")}</p>
    </div>
  );
}
