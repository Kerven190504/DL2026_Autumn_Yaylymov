import { useEffect, useState } from "react";
import { useLanguage } from "../i18n.jsx";
import Modal from "./Modal.jsx";
import Leaderboard from "./Leaderboard.jsx";
import { api } from "../api.js";

export default function LeaderboardModal({ onClose }) {
  const { t } = useLanguage();
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    api.getLeaderboard(50).then(setEntries).catch(() => setEntries([]));
  }, []);

  return (
    <Modal title={t("leaderboardModalTitle")} onClose={onClose}>
      {entries === null ? <p className="leaderboard__empty">{t("loading")}</p> : <Leaderboard entries={entries} />}
    </Modal>
  );
}
