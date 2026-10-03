import { useState } from "react";
import { useLanguage } from "../i18n.jsx";
import Leaderboard from "./Leaderboard.jsx";

export default function FinishScreen({
  totalScore,
  questionsCount,
  onSubmitName,
  submitted,
  submittedName,
  rankInfo,
  leaderboardEntries,
  onPlayAgain,
}) {
  const { t, lang } = useLanguage();
  const [name, setName] = useState("");
  const locale = lang === "en" ? "en-US" : "ru-RU";

  return (
    <div className="finish-screen-grid">
      <div className="finish-screen">
        <p className="finish-screen__eyebrow">{t("finishEyebrow")}</p>
        <h1 className="finish-screen__score">{totalScore.toLocaleString(locale)}</h1>
        <p className="finish-screen__meta">{t("finishMetaSuffix", questionsCount)}</p>

        {!submitted ? (
          <form
            className="finish-screen__form"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) onSubmitName(name.trim());
            }}
          >
            <input
              className="text-input"
              placeholder={t("namePlaceholder")}
              value={name}
              maxLength={30}
              onChange={(e) => setName(e.target.value)}
            />
            <button type="submit" className="btn btn--primary" disabled={!name.trim()}>
              {t("submitToBoard")}
            </button>
          </form>
        ) : (
          <>
            <p className="finish-screen__submitted">{t("submittedText")}</p>
            {rankInfo && <p className="finish-screen__rank">{t("rankText", rankInfo.rank, rankInfo.total)}</p>}
          </>
        )}

        <button type="button" className="btn btn--ghost" onClick={onPlayAgain}>
          {t("playAgain")}
        </button>
      </div>

      <div className="finish-screen__board">
        <h3 className="finish-screen__subheading">{t("leaderboardHeading")}</h3>
        <Leaderboard
          entries={leaderboardEntries}
          highlight={submitted ? { player_name: submittedName, score: totalScore } : null}
        />
      </div>
    </div>
  );
}
