import { createContext, useContext, useEffect, useState } from "react";

// Область охвата: интерфейс (кнопки, подписи, формы) переведён
// полностью. Игровой контент — названия локаций, тексты вопросов,
// подписи категорий и регионы-подсказки — приходит с бэкенда только
// на русском (data.py, db.py); перевод контента потребовал бы либо
// хранить обе версии в БД, либо подключать внешний переводчик — за
// рамками этой итерации, см. README "Известные ограничения".

const STRINGS = {
  ru: {
    logoTagline: "Географическая викторина",
    headerScoreSuffix: "очк.",

    startEyebrow: "Мини-игра по географии",
    startTitle: "Насколько хорошо вы чувствуете карту мира?",
    startLede:
      "Столицы, знаменитые достопримечательности и природные объекты — кликните на карте туда, где они находятся. Чем точнее клик, тем больше очков.",
    statLocations: "локаций",
    statThemes: "темы",
    statPerQuestion: "на вопрос",
    statSuggested: "предложено игроками",
    modeLabel: "Режим игры",
    modeClassic: "10 вопросов",
    modeClassicHint: "Короткая партия, итоговый счёт в конце",
    modeEndless: "Без ограничений",
    modeEndlessHint: "Играйте, пока не надоест",
    suggestLocationLink: "+ Предложить свою локацию",
    leaderboardLink: "Таблица лидеров →",
    globeCaption: (n) => `Крутите глобус и кликайте по точкам — ${n} локаций ждут в игре`,
    thematicLabel: "Тематика",

    carouselAll: "Всё сразу",
    category_capital: "Столицы",
    category_landmark: "Достопримечательности",
    category_nature: "Природные объекты",
    category_community: "От игроков",
    carouselAllBlurb: "Полный набор — все локации вперемешку, включая те, что добавили другие игроки.",
    startGame: "Начать игру →",
    prevTheme: "Предыдущая тема",
    nextTheme: "Следующая тема",
    location_one: "локация",
    location_few: "локации",
    location_many: "локаций",

    questionScoreSuffix: "очк.",
    questionProgress: (i, total) => (total ? `Вопрос ${i} из ${total}` : `Вопрос ${i}`),
    hintButton: "Подсказка (−30% очков)",
    hintUsedButton: "Подсказка использована",
    hintRegionPrefix: "Регион:",
    confirmButton: "Подтвердить ответ",
    tipHasGuess: "Кликните ещё раз, чтобы переставить точку",
    tipNoGuess: "Кликните по карте, чтобы отметить место",

    missLabel: "Промах:",
    correctLabel: "Правильно:",
    nextQuestion: "Следующий вопрос",
    seeResults: "Посмотреть результат",
    kmLessThanOne: "меньше 1 км",
    pointsSuffix: "очков",

    finishEyebrow: "Игра окончена",
    finishMetaSuffix: (n) => `очков за ${n} ${pluralRu(n, "вопрос", "вопроса", "вопросов")}`,
    namePlaceholder: "Ваше имя",
    submitToBoard: "В таблицу лидеров",
    submittedText: "✓ Результат добавлен в таблицу лидеров",
    rankText: (rank, total) => `Вы на ${rank}-м месте из ${total}`,
    playAgain: "Сыграть ещё раз",
    leaderboardHeading: "Таблица лидеров",

    leaderboardEmpty: "Пока никто не сыграл — станьте первым!",
    colRank: "#",
    colPlayer: "Игрок",
    colScore: "Счёт",
    colMode: "Режим",
    modeLabelClassic: "10 вопросов",
    modeLabelEndless: "без ограничений",
    showMore: (n) => `Показать ещё (${n})`,

    suggestTitle: "Предложить локацию",
    suggestName: "Название места",
    suggestNamePlaceholder: "Например: Минский Арбат",
    suggestCategoryLabel: "Тип локации",
    suggestRegion: "Регион (необязательно, для подсказки)",
    suggestRegionPlaceholder: "Например: Беларусь",
    suggestMapLabel: "Отметьте место на карте",
    suggestNoPoint: "Точка ещё не выбрана",
    suggestSubmit: "Предложить",
    suggestSubmitting: "Отправляем…",
    suggestDoneText: "Спасибо! Локация добавлена в тему «От игроков» — она уже доступна в игре.",
    suggestDoneButton: "Готово",

    leaderboardModalTitle: "Таблица лидеров",
    loading: "Загрузка…",
    close: "Закрыть",
  },

  en: {
    logoTagline: "Geography quiz",
    headerScoreSuffix: "pts",

    startEyebrow: "A geography mini-game",
    startTitle: "How well do you know the world map?",
    startLede:
      "Capitals, famous landmarks and natural wonders — click on the map where you think they are. The closer your click, the more points you get.",
    statLocations: "locations",
    statThemes: "themes",
    statPerQuestion: "per question",
    statSuggested: "suggested by players",
    modeLabel: "Game mode",
    modeClassic: "10 questions",
    modeClassicHint: "A short round, final score at the end",
    modeEndless: "Unlimited",
    modeEndlessHint: "Play for as long as you like",
    suggestLocationLink: "+ Suggest a location",
    leaderboardLink: "Leaderboard →",
    globeCaption: (n) => `Spin the globe and click the dots — ${n} locations await in the game`,
    thematicLabel: "Theme",

    carouselAll: "Everything",
    category_capital: "Capitals",
    category_landmark: "Landmarks",
    category_nature: "Nature",
    category_community: "From players",
    carouselAllBlurb: "The full set — every location mixed together, including ones added by other players.",
    startGame: "Start game →",
    prevTheme: "Previous theme",
    nextTheme: "Next theme",
    location_one: "location",
    location_few: "locations",
    location_many: "locations",

    questionScoreSuffix: "pts",
    questionProgress: (i, total) => (total ? `Question ${i} of ${total}` : `Question ${i}`),
    hintButton: "Hint (−30% points)",
    hintUsedButton: "Hint used",
    hintRegionPrefix: "Region:",
    confirmButton: "Confirm answer",
    tipHasGuess: "Click again to move the pin",
    tipNoGuess: "Click the map to mark the spot",

    missLabel: "Miss:",
    correctLabel: "Correct:",
    nextQuestion: "Next question",
    seeResults: "See results",
    kmLessThanOne: "less than 1 km",
    pointsSuffix: "points",

    finishEyebrow: "Game over",
    finishMetaSuffix: (n) => `points over ${n} question${n === 1 ? "" : "s"}`,
    namePlaceholder: "Your name",
    submitToBoard: "Submit to leaderboard",
    submittedText: "✓ Added to the leaderboard",
    rankText: (rank, total) => `You're #${rank} out of ${total}`,
    playAgain: "Play again",
    leaderboardHeading: "Leaderboard",

    leaderboardEmpty: "No one has played yet — be the first!",
    colRank: "#",
    colPlayer: "Player",
    colScore: "Score",
    colMode: "Mode",
    modeLabelClassic: "10 questions",
    modeLabelEndless: "unlimited",
    showMore: (n) => `Show more (${n})`,

    suggestTitle: "Suggest a location",
    suggestName: "Place name",
    suggestNamePlaceholder: "E.g. Golden Gate Bridge",
    suggestCategoryLabel: "Location type",
    suggestRegion: "Region (optional, used as a hint)",
    suggestRegionPlaceholder: "E.g. North America",
    suggestMapLabel: "Mark the spot on the map",
    suggestNoPoint: "No point picked yet",
    suggestSubmit: "Suggest",
    suggestSubmitting: "Sending…",
    suggestDoneText: "Thanks! Your location was added to the \"From players\" theme — it's already playable.",
    suggestDoneButton: "Done",

    leaderboardModalTitle: "Leaderboard",
    loading: "Loading…",
    close: "Close",
  },
};


function pluralRu(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return few;
  return many;
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem("atlas-lang") || "ru";
    } catch {
      return "ru";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("atlas-lang", lang);
    } catch {
      // приватный режим / отключённый localStorage — просто не сохраняем
    }
  }, [lang]);

  function toggleLang() {
    setLang((l) => (l === "ru" ? "en" : "ru"));
  }

  function t(key, ...args) {
    const entry = STRINGS[lang][key];
    return typeof entry === "function" ? entry(...args) : entry;
  }

  function plural(n, key) {
    if (lang === "en") return n === 1 ? STRINGS.en[`${key}_one`] : STRINGS.en[`${key}_few`];
    return pluralRu(n, STRINGS.ru[`${key}_one`], STRINGS.ru[`${key}_few`], STRINGS.ru[`${key}_many`]);
  }

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t, plural }}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
