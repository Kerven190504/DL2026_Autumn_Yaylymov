// По умолчанию — пустая строка (относительные пути): запросы идут на
// ТОТ ЖЕ хост и порт, с которого загружена страница, а Vite (в dev
// через server.proxy, см. vite.config.js) сам перенаправляет /api на
// localhost:8000 бэкенда. Это надёжнее, чем раньше вычислять хост
// бэкенда на стороне браузера ("${текущий host}:8000") — тот подход
// ломался на сетях/туннелях, где наружу проброшен только порт 5173
// (например, часть VPN-конфигураций), а порт 8000 недоступен.
// VITE_API_URL остаётся для случаев, когда бэкенд и правда на другом
// хосте/порте (например, отдельный прод-деплой без общего прокси).
const BASE_URL = import.meta.env.VITE_API_URL || "";

async function request(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Ошибка запроса: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getCategories: (lang = "ru") => request(`/api/categories?lang=${lang}`),

  startQuiz: (mode, questionCount, category, lang = "ru") =>
    request("/api/quiz/start", {
      method: "POST",
      body: JSON.stringify({ mode, question_count: questionCount, category, lang }),
    }),

  useHint: (sessionId) =>
    request(`/api/quiz/${sessionId}/hint`, { method: "POST" }),

  submitAnswer: (sessionId, lat, lng) =>
    request(`/api/quiz/${sessionId}/answer`, {
      method: "POST",
      body: JSON.stringify({ lat, lng }),
    }),

  getLeaderboard: (limit = 50) => request(`/api/quiz/leaderboard?limit=${limit}`),

  submitLeaderboardEntry: (sessionId, playerName) =>
    request(`/api/quiz/${sessionId}/leaderboard`, {
      method: "POST",
      body: JSON.stringify({ player_name: playerName }),
    }),

  suggestLocation: ({ name, category, lat, lng, region }) =>
    request("/api/locations/suggest", {
      method: "POST",
      body: JSON.stringify({ name, category, lat, lng, region: region || "" }),
    }),
};
