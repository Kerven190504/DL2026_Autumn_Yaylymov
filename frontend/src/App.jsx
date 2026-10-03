import { useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import { useLanguage } from "./i18n.jsx";
import AuroraBackground from "./components/AuroraBackground.jsx";
import LanguageSwitch from "./components/LanguageSwitch.jsx";
import QuizMap from "./components/QuizMap.jsx";
import StartScreen from "./components/StartScreen.jsx";
import QuestionPanel from "./components/QuestionPanel.jsx";
import ResultPanel from "./components/ResultPanel.jsx";
import FinishScreen from "./components/FinishScreen.jsx";

const MAX_TIME = 25; // секунд на вопрос

function categoryToMapStyle(category) {
  if (category === "landmark") return "landmarks";
  if (category === "nature") return "nature";
  return "capitals"; // capital, community (пока не разбито) и любые другие — самый "чистый" вариант
}

export default function App() {
  const { t, lang } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [phase, setPhase] = useState("start"); // start | playing | answered | finished
  const [startError, setStartError] = useState(null);

  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [guess, setGuess] = useState(null);
  const [result, setResult] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [hintRegion, setHintRegion] = useState(null);

  const [timeLeft, setTimeLeft] = useState(MAX_TIME);
  const timerRef = useRef(null);

  const [leaderboardEntries, setLeaderboardEntries] = useState([]);
  const [submittedToBoard, setSubmittedToBoard] = useState(false);
  const [submittedName, setSubmittedName] = useState(null);
  const [rankInfo, setRankInfo] = useState(null);

  useEffect(() => {
    refreshCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  function refreshCategories() {
    api.getCategories(lang).then(setCategories).catch((err) => console.error("Не удалось загрузить темы:", err));
  }

  // Таймер вопроса: тикает пока phase === "playing"
  useEffect(() => {
    if (phase !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, question]);

  useEffect(() => {
    if (phase === "playing" && timeLeft === 0) {
      confirmAnswer(guess);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  async function handleStart(mode, category) {
    setStartError(null);
    try {
      const res = await api.startQuiz(mode, 10, category, lang);
      setSessionId(res.session_id);
      setQuestion(res.question);
      setTotalScore(0);
      setAnsweredCount(0);
      setGuess(null);
      setResult(null);
      setHintRegion(null);
      setSubmittedToBoard(false);
      setSubmittedName(null);
      setRankInfo(null);
      setTimeLeft(MAX_TIME);
      setPhase("playing");
    } catch (err) {
      setStartError(err.message);
    }
  }

  async function handleUseHint() {
    if (hintRegion) return;
    try {
      const res = await api.useHint(sessionId);
      setHintRegion(res.region);
    } catch (err) {
      // подсказка необязательна для игры — молча игнорируем сбой
      console.error(err);
    }
  }

  async function confirmAnswer(currentGuess) {
    clearInterval(timerRef.current);
    // Если игрок не успел кликнуть — считаем это промахом мимо всех
    // континентов сразу (нулевые координаты), а не блокируем игру.
    const point = currentGuess || { lat: 0, lng: 0 };
    try {
      const res = await api.submitAnswer(sessionId, point.lat, point.lng);
      setResult(res);
      setTotalScore(res.total_score);
      setAnsweredCount((c) => c + 1);
      setPhase("answered");
    } catch (err) {
      setStartError(err.message);
      setPhase("start");
    }
  }

  function handleNext() {
    if (result.is_finished) {
      setPhase("finished");
      api.getLeaderboard().then(setLeaderboardEntries).catch(() => {});
      return;
    }
    setQuestion(result.next_question);
    setGuess(null);
    setResult(null);
    setHintRegion(null);
    setTimeLeft(MAX_TIME);
    setPhase("playing");
  }

  async function handleSubmitName(name) {
    try {
      const { rank, total } = await api.submitLeaderboardEntry(sessionId, name);
      const entries = await api.getLeaderboard();
      setLeaderboardEntries(entries);
      setSubmittedToBoard(true);
      setSubmittedName(name);
      setRankInfo({ rank, total });
    } catch (err) {
      console.error(err);
    }
  }

  function handlePlayAgain() {
    setPhase("start");
  }

  return (
    <>
      <AuroraBackground />
      <div className="app">
        <header className="app__header">
          <div className="app__header-inner">
            <div className="app__brand">
              <svg className="app__brand-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M14.5 9.5 12 12l-2.5 2.5L12 12l2.5-2.5Z" fill="currentColor" />
                <path d="m14.5 9.5-5 5 5-5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
              <div className="app__brand-text">
                <span className="app__logo">Атлас</span>
                <span className="app__logo-tagline">{t("logoTagline")}</span>
              </div>
            </div>
            <div className="app__header-right">
              {phase !== "start" && phase !== "finished" && (
                <span className="app__header-score">
                  {totalScore} {t("headerScoreSuffix")}
                </span>
              )}
              <LanguageSwitch />
            </div>
          </div>
        </header>

      {phase === "start" && (
        <div className="game-page">
          <StartScreen
            categories={categories}
            onStart={handleStart}
            error={startError}
            onCategoriesChanged={refreshCategories}
          />
        </div>
      )}

      {(phase === "playing" || phase === "answered") && question && (
        <div className="game-page">
          <div className="game-layout">
            <div className="game-layout__map">
              <QuizMap
                guess={guess}
                correct={phase === "answered" ? { lat: result.correct_lat, lng: result.correct_lng } : null}
                onGuess={(lat, lng) => phase === "playing" && setGuess({ lat, lng })}
                disabled={phase !== "playing"}
                mapStyle={categoryToMapStyle(question.category)}
              />
            </div>
            <div className="game-layout__panel">
              {phase === "playing" ? (
                <QuestionPanel
                  question={question}
                  totalScore={totalScore}
                  timeLeft={timeLeft}
                  maxTime={MAX_TIME}
                  hintRegion={hintRegion}
                  onUseHint={handleUseHint}
                  hintUsed={!!hintRegion}
                  hasGuess={!!guess}
                  onConfirm={() => confirmAnswer(guess)}
                />
              ) : (
                <ResultPanel result={result} onNext={handleNext} />
              )}
            </div>
          </div>
        </div>
      )}

      {phase === "finished" && (
        <div className="game-page">
          <FinishScreen
            totalScore={totalScore}
            questionsCount={answeredCount}
            onSubmitName={handleSubmitName}
            submitted={submittedToBoard}
            submittedName={submittedName}
            rankInfo={rankInfo}
            leaderboardEntries={leaderboardEntries}
            onPlayAgain={handlePlayAgain}
          />
        </div>
      )}
      </div>
    </>
  );
}
