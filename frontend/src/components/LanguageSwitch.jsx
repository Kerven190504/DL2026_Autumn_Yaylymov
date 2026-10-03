import { useLanguage } from "../i18n.jsx";

export default function LanguageSwitch() {
  const { lang, toggleLang } = useLanguage();
  return (
    <button
      type="button"
      className="lang-switch"
      onClick={toggleLang}
      aria-label={lang === "ru" ? "Switch to English" : "Переключить на русский"}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
      <span>{lang === "ru" ? "RU" : "EN"}</span>
    </button>
  );
}
