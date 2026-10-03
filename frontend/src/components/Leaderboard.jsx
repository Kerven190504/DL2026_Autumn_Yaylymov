import { useState } from "react";
import { useLanguage } from "../i18n.jsx";

const PAGE_SIZE = 10;

export default function Leaderboard({ entries, highlight }) {
  const { t, lang } = useLanguage();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const locale = lang === "en" ? "en-US" : "ru-RU";
  const MODE_LABELS = { classic: t("modeLabelClassic"), endless: t("modeLabelEndless") };

  if (!entries.length) {
    return <p className="leaderboard__empty">{t("leaderboardEmpty")}</p>;
  }

  const visible = entries.slice(0, visibleCount);
  const isHighlighted = (entry) =>
    highlight && entry.player_name === highlight.player_name && entry.score === highlight.score;

  return (
    <>
      <table className="leaderboard">
        <thead>
          <tr>
            <th>{t("colRank")}</th>
            <th>{t("colPlayer")}</th>
            <th>{t("colScore")}</th>
            <th>{t("colMode")}</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((entry, i) => (
            <tr
              key={`${entry.player_name}-${entry.created_at}-${i}`}
              className={isHighlighted(entry) ? "leaderboard__row--you" : undefined}
            >
              <td>{i + 1}</td>
              <td>{entry.player_name}</td>
              <td>{entry.score.toLocaleString(locale)}</td>
              <td>{MODE_LABELS[entry.mode] || entry.mode}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {entries.length > visibleCount && (
        <button
          type="button"
          className="btn btn--ghost leaderboard__more"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
        >
          {t("showMore", entries.length - visibleCount)}
        </button>
      )}
    </>
  );
}
