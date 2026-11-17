import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ApiError, api, type Row } from "./api";
import "./style.css";

type Session = { token: string; admin: { email: string; role: string } };
type Page =
  | "overview"
  | "items"
  | "cases"
  | "comments"
  | "feedback"
  | "claims"
  | "users"
  | "categories"
  | "feature-flags"
  | "audit"
  | "risk-events"
  | "admins";
const names: Record<Page, string> = {
  overview: "Обзор",
  items: "Объявления",
  cases: "Обращения",
  comments: "Комментарии",
  feedback: "Отзывы о платформе",
  claims: "Заявки на возврат",
  users: "Участники",
  categories: "Категории",
  "feature-flags": "Функции",
  audit: "Журнал действий",
  "risk-events": "События риска",
  admins: "Команда",
};
const roles: Record<string, string> = {
  SUPER_ADMIN: "Администратор",
  MODERATOR: "Модератор",
  SUPPORT: "Поддержка",
  SECURITY_ANALYST: "Безопасность",
  READONLY_ANALYST: "Аналитик",
};
const labels: Record<string, string> = {
  PUBLISHED: "Опубликовано",
  PENDING_REVIEW: "На проверке",
  REMOVED: "Удалено",
  RESOLVED: "Завершено",
  CLOSED: "Закрыто",
  DRAFT: "Черновик",
  LOST: "Потеряно",
  FOUND: "Найдено",
  OPEN: "Открыто",
  IN_REVIEW: "В работе",
  ACTIVE: "Активен",
  RESTRICTED: "Ограничен",
  BANNED: "Заблокирован",
  DELETED: "Удалён",
  SUBMITTED: "Отправлена",
  SCREENING: "Проверяется",
  PLAUSIBLE: "Подтверждена",
  REJECTED: "Отклонена",
  UNDER_REVIEW: "На рассмотрении",
  NEEDS_MORE_INFORMATION: "Нужны уточнения",
  APPROVED_FOR_HANDOFF: "К передаче",
  COMPLETED: "Возвращено",
  WITHDRAWN: "Отозвана",
  item_review: "Проверка объявления",
  claim_dispute: "Спор по заявке",
  handoff_dispute: "Спор о возврате",
  report: "Жалоба",
  VISIBLE: "Видно всем",
  NEW: "Новый",
  READ: "Прочитан",
  DONE: "Учтён",
  idea: "Идея",
  problem: "Проблема",
  praise: "Благодарность",
  question: "Вопрос",
  other: "Другое",
};
const date = (value: unknown) =>
  value
    ? new Date(String(value)).toLocaleString("ru-RU", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";
function Badge({ value }: { value: string }) {
  return (
    <span
      className={`badge ${["PUBLISHED", "ACTIVE", "COMPLETED", "RESOLVED", "PLAUSIBLE", "DONE", "VISIBLE"].includes(value) ? "good" : ["REMOVED", "BANNED", "REJECTED"].includes(value) ? "bad" : ""}`}
    >
      {labels[value] || value}
    </span>
  );
}
const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Counts up to the value with an ease-out, so numbers feel alive on arrival. */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(reducedMotion() ? value : 0);
  const from = useRef(0);
  useEffect(() => {
    if (reducedMotion()) return setShown(value);
    const start = performance.now(),
      a = from.current,
      dur = 1100;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur),
        eased = 1 - Math.pow(1 - p, 4);
      setShown(Math.round(a + (value - a) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{shown.toLocaleString("ru-RU")}</>;
}

/** Decorative floating light particles. */
function Particles({ count = 14 }: { count?: number }) {
  return (
    <div className="particles" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}

/** Glass cards light up under the cursor: feeds --mx/--my to the hovered card. */
function useSpotlight() {
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>(
        ".metric, .panel, .modal, .login-form form, .hero",
      );
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);
}

function Empty() {
  return (
    <div className="empty">
      <span>✓</span>
      <h3>Здесь пока ничего нет</h3>
      <p>Новые записи появятся автоматически после действий участников.</p>
    </div>
  );
}
function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="error" role="alert">
      {message}
    </div>
  );
}

function Login({ onLogin }: { onLogin: (s: Session) => void }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [totp, setTotp] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [setup, setSetup] = useState<Row | null>(null);
  useSpotlight();
  async function submit(e: React.SubmitEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (setup) {
        await api("auth/mfa/enable", undefined, "POST", {
          setupToken: setup.setupToken,
          code: totp,
        });
        setSetup(null);
      }
      onLogin(
        await api<Session>("auth/login", undefined, "POST", {
          email,
          password,
          ...(totp ? { totp } : {}),
        }),
      );
    } catch (err) {
      if (err instanceof ApiError && err.code === "admin.mfa_setup_required") {
        try {
          setSetup(
            await api("auth/mfa/setup", undefined, "POST", { email, password }),
          );
        } catch (e) {
          setError((e as Error).message);
        }
      } else setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login">
      <section className="login-story">
        <Particles count={18} />
        <div className="brand">
          <span className="brand-mark">т</span> табылды
        </div>
        <div>
          <span className="eyebrow">КАЖДАЯ ВЕЩЬ МОЖЕТ ВЕРНУТЬСЯ</span>
          <h1>
            Помогаем находкам
            <br />
            стать возвращениями.
          </h1>
          <p>
            Место, где забота людей становится результатом.
            <br />
            Проверяйте объявления, помогайте участникам
            <br />и делайте возвраты безопаснее.
          </p>
        </div>
        <span className="story-footer">
          Табылды · Платформа потерянных и найденных вещей
        </span>
      </section>
      <main className="login-form">
        <form onSubmit={submit}>
          <span className="eyebrow">ПАНЕЛЬ УПРАВЛЕНИЯ</span>
          <h2>Рады видеть вас</h2>
          <p className="muted">Войдите с учётной записью вашей команды.</p>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Пароль
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {setup && (
            <div className="note">
              <strong>Настройте двухфакторный вход</strong>
              <p>
                Добавьте этот ключ в приложение аутентификации, затем введите
                полученный код.
              </p>
              <code className="secret">{setup.secret}</code>
            </div>
          )}
          <label>
            Код из приложения аутентификации{" "}
            <span className="muted">{setup ? "" : "(если включён)"}</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required={!!setup}
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
            />
          </label>
          {error && <ErrorNotice message={error} />}
          <button className="primary wide" disabled={busy}>
            {busy
              ? "Входим…"
              : setup
                ? "Подтвердить и войти"
                : "Войти в панель"}{" "}
            <span>↗</span>
          </button>
          <p className="login-note">
            Доступ предназначен для команды Табылды.
            <br />
            Действия с данными сохраняются в журнале.
          </p>
        </form>
      </main>
    </div>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      return JSON.parse(sessionStorage.getItem("tabyldy-admin") || "null");
    } catch {
      return null;
    }
  });
  const [page, setPage] = useState<Page>("overview"),
    [revision, setRevision] = useState(0);
  const [data, setData] = useState<Row[] | Row | null>(null),
    [analytics, setAnalytics] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [detail, setDetail] = useState<Row | null>(null),
    [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false),
    [note, setNote] = useState(""),
    [form, setForm] = useState<Row | null>(null),
    [drawer, setDrawer] = useState(false);
  useSpotlight();
  const role = session?.admin.role || "";
  const canModerate = ["SUPER_ADMIN", "MODERATOR"].includes(role),
    canSecurity = ["SUPER_ADMIN", "MODERATOR", "SECURITY_ANALYST"].includes(
      role,
    );
  const allowed = (p: Page) =>
    role === "SUPER_ADMIN" ||
    ["overview", "items", "categories", "feature-flags", "feedback"].includes(p) ||
    (["cases", "comments"].includes(p) && role !== "READONLY_ANALYST") ||
    (p === "claims" && ["MODERATOR", "SECURITY_ANALYST"].includes(role)) ||
    (p === "users" && role !== "READONLY_ANALYST") ||
    (["audit", "risk-events"].includes(p) && role === "SECURITY_ANALYST");
  function logout() {
    sessionStorage.removeItem("tabyldy-admin");
    setSession(null);
    setData(null);
    setDetail(null);
    setForm(null);
    setPage("overview");
  }
  useEffect(() => {
    window.addEventListener("session-expired", logout);
    return () => window.removeEventListener("session-expired", logout);
  }, []);
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status) params.set("status", status);
    api<Row | Row[]>(
      `${page}?${params}`,
      session.token,
      "GET",
      undefined,
      controller.signal,
    )
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    if (page === "overview")
      api(
        "analytics?days=14",
        session.token,
        "GET",
        undefined,
        controller.signal,
      )
        .then(setAnalytics)
        .catch((e) => {
          if (e.name !== "AbortError") setError(e.message);
        });
    return () => controller.abort();
  }, [session, page, revision, query, status]);
  useEffect(() => {
    if (!session) return;
    api("me", session.token).catch((e) => setError(e.message));
  }, [session]);
  function navigate(p: Page) {
    setPage(p);
    setQuery("");
    setStatus("");
    setDetail(null);
    setForm(null);
    setDrawer(false);
    setSuccess("");
  }
  async function open(row: Row) {
    if (!session) return;
    setError("");
    setNote("");
    setDetailLoading(true);
    setDetail(row);
    try {
      setDetail(await api(`${page}/${row.id}`, session.token));
    } catch (e) {
      setError((e as Error).message);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }
  async function mutate(path: string, body: unknown, method = "POST") {
    if (!session || busy) return;
    setBusy(true);
    setError("");
    try {
      await api(path, session.token, method, body);
      setSuccess("Изменения сохранены");
      setRevision((r) => r + 1);
      setDetail(null);
      setForm(null);
      setNote("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!session)
    return (
      <Login
        onLogin={(s) => {
          sessionStorage.setItem("tabyldy-admin", JSON.stringify(s));
          setSession(s);
        }}
      />
    );
  const rows = Array.isArray(data) ? data : [];
  const filters: Partial<Record<Page, string[]>> = {
    items: [
      "PENDING_REVIEW",
      "PUBLISHED",
      "RESOLVED",
      "CLOSED",
      "REMOVED",
      "DRAFT",
    ],
    cases: ["OPEN", "IN_REVIEW", "RESOLVED"],
    comments: ["VISIBLE", "REMOVED"],
    feedback: ["NEW", "READ", "DONE"],
    users: ["ACTIVE", "RESTRICTED", "BANNED", "DELETED"],
    claims: [
      "SUBMITTED",
      "NEEDS_MORE_INFORMATION",
      "PLAUSIBLE",
      "UNDER_REVIEW",
      "APPROVED_FOR_HANDOFF",
      "COMPLETED",
      "REJECTED",
    ],
  };
  const overview = data && !Array.isArray(data) ? data : {};
  return (
    <div className="layout">
      <aside className={drawer ? "sidebar visible" : "sidebar"}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
        >
          <span className="brand-mark">т</span> табылды
        </a>
        <div className="workspace-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
        <nav>
          {(Object.keys(names) as Page[]).filter(allowed).map((p, i) => (
            <button
              key={p}
              className={p === page ? "nav active" : "nav"}
              onClick={() => navigate(p)}
            >
              <span className="nav-icon">
                {
                  (
                    {
                      overview: "◫",
                      items: "▤",
                      cases: "◷",
                      comments: "✎",
                      feedback: "✉",
                      claims: "⇄",
                      users: "♙",
                      categories: "▦",
                      "feature-flags": "⚑",
                      audit: "≡",
                      "risk-events": "◇",
                      admins: "♧",
                    } as Record<Page, string>
                  )[p]
                }
              </span>
              {names[p]}
              {p === page && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="avatar">{session.admin.email[0].toUpperCase()}</div>
          <div>
            <strong>{roles[role]}</strong>
            <small>{session.admin.email}</small>
          </div>
          <button className="icon-btn" title="Выйти" onClick={logout}>
            ↪
          </button>
        </div>
      </aside>
      <main className="main">
        <header>
          <div className="breadcrumb">
            <button
              className="icon-btn menu"
              aria-label="Открыть меню"
              onClick={() => setDrawer(!drawer)}
            >
              ☰
            </button>
            Рабочее пространство <span>/</span>
            <strong>{names[page]}</strong>
          </div>
          <div className="header-right">
            <span className="live-dot" /> Подключено к API{" "}
            <span className="header-date">
              {new Date().toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>
        </header>
        <div className="content" key={page}>
          <div className="page-heading">
            <div>
              <span className="eyebrow">ТАБЫЛДЫ / УПРАВЛЕНИЕ</span>
              <h1>
                {page === "overview" ? "Всё начинается с заботы" : names[page]}
              </h1>
              <p className="muted">
                {page === "overview"
                  ? "Люди, находки и возвращения — вся картина в одном месте."
                  : "Проверяйте записи и помогайте участникам безопасно вернуть вещи."}
              </p>
            </div>
            <button
              className="secondary"
              disabled={loading}
              onClick={() => setRevision((r) => r + 1)}
            >
              ↻ Обновить
            </button>
          </div>
          {error && <ErrorNotice message={error} />}{" "}
          {success && (
            <div className="success" role="status">
              ✓ {success}
              <button
                className="icon-btn"
                aria-label="Скрыть уведомление"
                onClick={() => setSuccess("")}
              >
                ×
              </button>
            </div>
          )}
          {page === "overview" ? (
            <>
              <div className="hero">
                <Particles />
                <div className="hero-copy">
                  <span className="eyebrow">БЛИЖЕ К СВОЕМУ ВЛАДЕЛЬЦУ</span>
                  <h2>
                    За каждой находкой —<br />
                    чья-то важная история.
                  </h2>
                  <p>Начните с объявлений, которым нужна ваша проверка.</p>
                  <button
                    className="light"
                    onClick={() => {
                      navigate("items");
                      setStatus("PENDING_REVIEW");
                    }}
                  >
                    Перейти к проверке <span>↗</span>
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit" />
                  <div className="orbit second" />
                  <div className="art-card">
                    <span>↩</span>
                    <small>нашлось.</small>
                  </div>
                  <span className="spark">✧</span>
                </div>
              </div>
              <div className="metrics">
                {[
                  [
                    "itemsPublished",
                    "Активные объявления",
                    "В открытом каталоге",
                  ],
                  [
                    "itemsResolved",
                    "Вещи возвращены",
                    "Включая сообщения участников",
                  ],
                  ["users", "Участники", "Активные учётные записи"],
                  [
                    "itemsPendingReview",
                    "Ожидают проверки",
                    "Нуждаются во внимании",
                  ],
                ].map(([key, name, caption], i) => (
                  <div className="metric" key={key}>
                    <span>
                      {name}
                      <span className="metric-icon">
                        {["▤", "↩", "♙", "◷"][i]}
                      </span>
                    </span>
                    <strong>
                      {loading ? (
                        <span className="skeleton" />
                      ) : (
                        <CountUp value={Number(overview[key] ?? 0)} />
                      )}
                    </strong>
                    <small>{caption}</small>
                  </div>
                ))}
              </div>
              <div className="dashboard-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <h3>Пульс платформы</h3>
                    <span className="muted">Последние 24 часа</span>
                  </div>
                  {[
                    ["openCases", "Открытые обращения", "cases"],
                    ["openReports", "Жалобы участников", "cases"],
                    ["newFeedback", "Новые отзывы о платформе", "feedback"],
                    ["claimsLast24h", "Заявки на возврат", "claims"],
                    ["riskEventsLast24h", "События риска", "risk-events"],
                  ]
                    .filter(([, , p]) => allowed(p as Page))
                    .map(([key, text, p]) => (
                      <button
                        className="pulse"
                        key={key}
                        onClick={() => navigate(p as Page)}
                      >
                        <span>{text}</span>
                        <strong>{overview[key] ?? "—"}</strong>
                        <span>↗</span>
                      </button>
                    ))}
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <h3>Возвраты за 14 дней</h3>
                    <span className="badge good">Обе стороны</span>
                  </div>
                  <div className="return-count">
                    {analytics?.claims?.completed != null ? (
                      <CountUp value={Number(analytics.claims.completed)} />
                    ) : (
                      "—"
                    )}
                    <span>подтверждённых возвратов</span>
                  </div>
                  <p className="muted">
                    Счётчик учитывает только завершённые заявки. Самостоятельные
                    отметки участников показаны отдельно в общей статистике.
                  </p>
                  <div className="note compact">
                    Встреча в общественном месте, проверка признаков и
                    подтверждение с двух сторон помогают сделать возврат
                    безопаснее.
                  </div>
                </section>
              </div>
              <section className="panel chart-panel">
                <div className="panel-heading">
                  <h3>Новые объявления</h3>
                  <span className="muted">За 14 дней · потеряно / найдено</span>
                </div>
                {analytics?.itemsPerDay?.length ? (
                  <div className="chart">
                    {analytics.itemsPerDay.map((r: Row, i: number) => (
                      <div
                        key={i}
                        className="bar-wrap"
                        style={{ "--i": i } as React.CSSProperties}
                      >
                        <div
                          className={`bar ${r.type === "LOST" ? "lost" : ""}`}
                          style={{
                            height: `${Math.max(6, (r.c / Math.max(...analytics.itemsPerDay.map((x: Row) => x.c))) * 120)}px`,
                          }}
                          title={`${r.day}: ${labels[r.type]} — ${r.c}`}
                        />
                        <small>{String(r.day).slice(5)}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">
                    График появится после первых публикаций.
                  </p>
                )}
              </section>
            </>
          ) : (
            <section className="panel records">
              <div className="toolbar">
                <div className="toolbar-left">
                  {["items", "users", "comments"].includes(page) && (
                    <input
                      className="search"
                      placeholder={
                        page === "comments" ? "Поиск по тексту…" : "Поиск по названию…"
                      }
                      aria-label="Поиск"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  )}{" "}
                  {filters[page] && (
                    <select
                      aria-label="Фильтр по статусу"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="">Все статусы</option>
                      {filters[page]!.map((s) => (
                        <option key={s} value={s}>
                          {labels[s]}
                        </option>
                      ))}
                    </select>
                  )}
                  <span className="muted">
                    {rows.length} записей
                    {["items", "users", "claims", "cases"].includes(page)
                      ? " · последние"
                      : ""}
                  </span>
                </div>
                {page === "categories" && role === "SUPER_ADMIN" && (
                  <button
                    className="primary"
                    onClick={() =>
                      setForm({
                        kind: "category",
                        nameRu: "",
                        nameKy: "",
                        slug: "",
                        publicationPolicy: "standard",
                      })
                    }
                  >
                    + Категория
                  </button>
                )}
                {page === "admins" && (
                  <button
                    className="primary"
                    onClick={() =>
                      setForm({
                        kind: "admin",
                        email: "",
                        password: "",
                        role: "MODERATOR",
                      })
                    }
                  >
                    + Участник команды
                  </button>
                )}
              </div>
              {loading ? (
                <div className="loading" role="status">
                  Загружаем данные…
                </div>
              ) : !rows.length ? (
                <Empty />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {(page === "items"
                          ? [
                              "Объявление",
                              "Категория",
                              "Статус",
                              "Опубликовано",
                              "",
                            ]
                          : page === "cases"
                            ? ["Обращение", "Предмет", "Статус", "Создано", ""]
                            : page === "comments"
                              ? ["Комментарий", "Объявление", "Статус", "Написан", ""]
                              : page === "feedback"
                                ? ["Сообщение", "От кого", "Статус", "Получено", ""]
                            : page === "claims"
                              ? ["Вещь", "Тип", "Статус", "Подана", ""]
                              : page === "users"
                                ? [
                                    "Участник",
                                    "Язык",
                                    "Статус",
                                    "Регистрация",
                                    "",
                                  ]
                                : page === "categories"
                                  ? [
                                      "Категория",
                                      "Кыргызча",
                                      "Политика фото",
                                      "Состояние",
                                      "",
                                    ]
                                  : page === "feature-flags"
                                    ? ["Функция", "Описание", "Состояние", ""]
                                    : page === "admins"
                                      ? [
                                          "Email",
                                          "Роль",
                                          "MFA",
                                          "Последний вход",
                                        ]
                                      : page === "audit"
                                        ? [
                                            "Действие",
                                            "Участник",
                                            "Объект",
                                            "Время",
                                          ]
                                        : [
                                            "Сигнал",
                                            "Участник",
                                            "Уровень",
                                            "Время",
                                          ]
                        ).map((x, i) => (
                          <th key={i}>{x}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr
                          key={r.id || r.key || i}
                          style={{ "--i": Math.min(i, 14) } as React.CSSProperties}
                        >
                          {page === "items" && (
                            <>
                              <td>
                                <div className="item-cell">
                                  <div className="thumb">
                                    {r.thumbUrl ? (
                                      <img src={r.thumbUrl} alt="" />
                                    ) : (
                                      "▧"
                                    )}
                                  </div>
                                  <div>
                                    <strong>{r.title}</strong>
                                    <small>
                                      {labels[r.listingType]} ·{" "}
                                      {r.ownerName || "Участник"}
                                    </small>
                                  </div>
                                </div>
                              </td>
                              <td>{r.category}</td>
                              <td>
                                <Badge value={r.status} />
                              </td>
                              <td>{date(r.createdAt)}</td>
                              <td>
                                {role !== "READONLY_ANALYST" && (
                                  <button
                                    className="table-action"
                                    onClick={() => open(r)}
                                  >
                                    Открыть ↗
                                  </button>
                                )}
                              </td>
                            </>
                          )}
                          {page === "cases" && (
                            <>
                              <td>
                                <strong>{labels[r.kind] || r.kind}</strong>
                                <small>
                                  {r.report?.reason ||
                                    r.resolution ||
                                    "Нужна проверка"}
                                </small>
                              </td>
                              <td>
                                {r.item?.title || r.user?.publicName || "—"}
                              </td>
                              <td>
                                <Badge value={r.status} />
                              </td>
                              <td>{date(r.createdAt)}</td>
                              <td>
                                <button
                                  className="table-action"
                                  onClick={() => {
                                    setDetail(r);
                                    setNote("");
                                  }}
                                >
                                  Открыть ↗
                                </button>
                              </td>
                            </>
                          )}
                          {page === "comments" && (
                            <>
                              <td>
                                <strong>{r.body}</strong>
                                <small>{r.authorName || "Участник"}</small>
                              </td>
                              <td>{r.itemTitle}</td>
                              <td>
                                <Badge value={r.status} />
                              </td>
                              <td>{date(r.createdAt)}</td>
                              <td>
                                {canModerate && r.status === "VISIBLE" && (
                                  <button
                                    className="table-action"
                                    disabled={busy}
                                    onClick={() => mutate(`comments/${r.id}/remove`, {})}
                                  >
                                    Удалить
                                  </button>
                                )}
                              </td>
                            </>
                          )}
                          {page === "feedback" && (
                            <>
                              <td>
                                <strong>{r.message}</strong>
                                <small>
                                  {labels[r.kind] || r.kind}
                                  {r.rating
                                    ? ` · ${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}`
                                    : ""}
                                </small>
                              </td>
                              <td>
                                {r.userName || "Гость"}
                                {r.contact && <small>Связь: {r.contact}</small>}
                              </td>
                              <td>
                                <Badge value={r.status} />
                              </td>
                              <td>{date(r.createdAt)}</td>
                              <td>
                                {role !== "READONLY_ANALYST" && r.status !== "DONE" && (
                                  <button
                                    className="table-action"
                                    disabled={busy}
                                    onClick={() =>
                                      mutate(`feedback/${r.id}/status`, {
                                        status: r.status === "NEW" ? "READ" : "DONE",
                                      })
                                    }
                                  >
                                    {r.status === "NEW" ? "Прочитано" : "Учтено"}
                                  </button>
                                )}
                              </td>
                            </>
                          )}
                          {page === "claims" && (
                            <>
                              <td>
                                <strong>{r.itemTitle}</strong>
                                <small>№ {r.id.slice(0, 8)}</small>
                              </td>
                              <td>{labels[r.itemType]}</td>
                              <td>
                                <Badge value={r.status} />
                              </td>
                              <td>{date(r.submittedAt)}</td>
                              <td>
                                <button
                                  className="table-action"
                                  onClick={() => open(r)}
                                >
                                  Рассмотреть ↗
                                </button>
                              </td>
                            </>
                          )}
                          {page === "users" && (
                            <>
                              <td>
                                <strong>{r.publicName || "Без имени"}</strong>
                                <small>{r.id.slice(0, 8)}</small>
                              </td>
                              <td>
                                {r.locale === "ky"
                                  ? "Кыргызча"
                                  : r.locale === "en"
                                    ? "English"
                                    : "Русский"}
                              </td>
                              <td>
                                <Badge value={r.accountStatus} />
                              </td>
                              <td>{date(r.createdAt)}</td>
                              <td>
                                <button
                                  className="table-action"
                                  onClick={() => open(r)}
                                >
                                  Профиль ↗
                                </button>
                              </td>
                            </>
                          )}
                          {page === "categories" && (
                            <>
                              <td>
                                <strong>{r.nameRu}</strong>
                                <small>{r.slug}</small>
                              </td>
                              <td>{r.nameKy}</td>
                              <td>
                                {r.publicationPolicy === "restricted_photo"
                                  ? "Фото скрыто"
                                  : r.publicationPolicy === "official_handover"
                                    ? "Передача организации"
                                    : "Стандартная"}
                              </td>
                              <td>{r.active ? "Активна" : "Скрыта"}</td>
                              <td>
                                {canModerate && (
                                  <button
                                    className="table-action"
                                    onClick={() =>
                                      setForm({ ...r, kind: "category" })
                                    }
                                  >
                                    Изменить ↗
                                  </button>
                                )}
                              </td>
                            </>
                          )}
                          {page === "feature-flags" && (
                            <>
                              <td>
                                <strong>{r.key}</strong>
                              </td>
                              <td>{r.description || "—"}</td>
                              <td>{r.enabled ? "Включена" : "Выключена"}</td>
                              <td>
                                {role === "SUPER_ADMIN" && (
                                  <button
                                    className="table-action"
                                    disabled={busy}
                                    onClick={() =>
                                      mutate(
                                        `feature-flags/${encodeURIComponent(r.key)}`,
                                        { enabled: !r.enabled },
                                        "PATCH",
                                      )
                                    }
                                  >
                                    {r.enabled ? "Выключить" : "Включить"}
                                  </button>
                                )}
                              </td>
                            </>
                          )}
                          {page === "admins" && (
                            <>
                              <td>{r.email}</td>
                              <td>{roles[r.role]}</td>
                              <td>{r.mfa ? "Включена" : "Не настроена"}</td>
                              <td>{date(r.lastLoginAt)}</td>
                            </>
                          )}
                          {page === "audit" && (
                            <>
                              <td>
                                <strong>{r.action}</strong>
                              </td>
                              <td>
                                {r.actorType} · {r.actorId?.slice(0, 8) || "—"}
                              </td>
                              <td>
                                {r.targetType || "—"} ·{" "}
                                {r.targetId?.slice(0, 8)}
                              </td>
                              <td>{date(r.createdAt)}</td>
                            </>
                          )}
                          {page === "risk-events" && (
                            <>
                              <td>
                                <strong>{r.signal}</strong>
                              </td>
                              <td>{r.userId?.slice(0, 8) || "—"}</td>
                              <td>{r.severity}</td>
                              <td>{date(r.createdAt)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
          <footer>
            Табылды <span>Безопасный путь от находки к возвращению</span>
          </footer>
        </div>
      </main>
      {detail && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!busy) setDetail(null);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Просмотр записи"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <h2>
                {detail.title ||
                  detail.itemTitle ||
                  detail.publicName ||
                  "Обращение"}
              </h2>
              <button
                className="icon-btn"
                aria-label="Закрыть"
                onClick={() => setDetail(null)}
              >
                ×
              </button>
            </div>
            {error && <ErrorNotice message={error} />}{" "}
            {detailLoading ? (
              <p>Загрузка…</p>
            ) : (
              <>
                <p className="muted">№ {detail.id}</p>
                {page === "items" && (
                  <>
                    <Badge value={detail.listingStatus} />
                    <p>{detail.descriptionPublic}</p>
                    <div className="media-grid">
                      {detail.media?.map((m: Row) => (
                        <a
                          key={m.id}
                          href={m.protectedUrl || m.publicUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {m.publicUrl || m.protectedUrl ? (
                            <img
                              src={m.publicUrl || m.protectedUrl}
                              alt="Фото вещи"
                            />
                          ) : (
                            <span>{m.status}</span>
                          )}
                        </a>
                      ))}
                    </div>
                    <p>
                      <strong>Категория:</strong> {detail.category?.nameRu}
                    </p>
                    <p>
                      <strong>Автор:</strong>{" "}
                      {detail.owner?.publicName || "Участник"}
                    </p>
                    {detail.hiddenFeatures?.length > 0 && (
                      <div className="note">
                        Скрытые признаки: {detail.hiddenFeatures.join(" · ")}
                      </div>
                    )}
                    {canModerate && (
                      <>
                        <label>
                          Комментарий владельцу
                          <textarea
                            maxLength={400}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                          />
                        </label>
                        <div className="actions">
                          <button
                            className="primary"
                            disabled={busy}
                            onClick={() =>
                              mutate(`items/${detail.id}/status`, {
                                status: "PUBLISHED",
                                note,
                              })
                            }
                          >
                            Опубликовать
                          </button>
                          <button
                            className="secondary"
                            disabled={busy || note.trim().length < 3}
                            onClick={() =>
                              mutate(`items/${detail.id}/status`, {
                                status: "PENDING_REVIEW",
                                note,
                              })
                            }
                          >
                            На доработку
                          </button>
                          <button
                            className="danger"
                            disabled={busy || note.trim().length < 3}
                            onClick={() =>
                              mutate(`items/${detail.id}/status`, {
                                status: "REMOVED",
                                note,
                              })
                            }
                          >
                            Удалить
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
                {page === "cases" && (
                  <>
                    <Badge value={detail.status} />
                    <p>{labels[detail.kind] || detail.kind}</p>
                    {detail.report && (
                      <div className="note">
                        <strong>{detail.report.reason}</strong>
                        <p>{detail.report.details}</p>
                      </div>
                    )}
                    <p>{detail.item?.title}</p>
                    {detail.comment && (
                      <div className="note">
                        <strong>Комментарий</strong>
                        <p>{detail.comment.body}</p>
                        {canModerate && detail.comment.status === "VISIBLE" && (
                          <button
                            className="secondary"
                            disabled={busy}
                            onClick={() =>
                              mutate(`comments/${detail.comment.id}/remove`, {})
                            }
                          >
                            Удалить комментарий
                          </button>
                        )}
                      </div>
                    )}
                    {detail.resolution && <p>{detail.resolution}</p>}
                    {canSecurity && detail.status !== "RESOLVED" && (
                      <>
                        <label>
                          Решение
                          <textarea
                            minLength={2}
                            maxLength={1000}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                          />
                        </label>
                        <div className="actions">
                          <button
                            className="secondary"
                            disabled={busy}
                            onClick={() =>
                              mutate(`cases/${detail.id}/assign`, {})
                            }
                          >
                            Взять в работу
                          </button>
                          <button
                            className="primary"
                            disabled={busy || note.trim().length < 2}
                            onClick={() =>
                              mutate(`cases/${detail.id}/resolve`, {
                                resolution: note,
                              })
                            }
                          >
                            Закрыть обращение
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
                {page === "claims" && (
                  <>
                    <Badge value={detail.status} />
                    <p>{detail.message}</p>
                    {detail.hiddenFeatures?.length > 0 && (
                      <div className="note">
                        Скрытые признаки вещи:{" "}
                        {detail.hiddenFeatures.join(" · ")}
                      </div>
                    )}
                    <h3>Подтверждения заявителя</h3>
                    {detail.evidence?.map((e: Row) => (
                      <div className="evidence" key={e.id}>
                        <strong>{e.evidenceType}</strong>
                        <p>{e.textContent}</p>
                        {e.attachmentUrl && (
                          <a
                            href={e.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Открыть вложение ↗
                          </a>
                        )}
                      </div>
                    ))}
                    {canModerate && detail.status !== "COMPLETED" && (
                      <>
                        <label>
                          Комментарий
                          <textarea
                            maxLength={400}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                          />
                        </label>
                        <div className="actions">
                          <button
                            className="primary"
                            disabled={busy}
                            onClick={() =>
                              mutate(`claims/${detail.id}/decision`, {
                                status: "PLAUSIBLE",
                                note,
                              })
                            }
                          >
                            Подтвердить
                          </button>
                          <button
                            className="secondary"
                            disabled={busy}
                            onClick={() =>
                              mutate(`claims/${detail.id}/decision`, {
                                status: "NEEDS_MORE_INFORMATION",
                                note,
                              })
                            }
                          >
                            Уточнить
                          </button>
                          <button
                            className="danger"
                            disabled={busy || note.length < 3}
                            onClick={() =>
                              mutate(`claims/${detail.id}/decision`, {
                                status: "REJECTED",
                                note,
                              })
                            }
                          >
                            Отклонить
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
                {page === "users" && (
                  <>
                    <Badge value={detail.accountStatus} />
                    {detail.contacts?.map((c: Row, i: number) => (
                      <p key={i}>
                        {c.channel}: {c.destination}
                      </p>
                    ))}
                    <p>
                      Объявления: {detail.items?.length ?? 0} · Заявки:{" "}
                      {detail.claims?.length ?? 0}
                    </p>
                    {canSecurity && detail.accountStatus !== "DELETED" && (
                      <>
                        <label>
                          Причина решения
                          <textarea
                            maxLength={400}
                            minLength={3}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                          />
                        </label>
                        <div className="actions">
                          {["ACTIVE", "RESTRICTED", "BANNED"].map((s) => (
                            <button
                              key={s}
                              className={
                                s === "BANNED" ? "danger" : "secondary"
                              }
                              disabled={busy || note.trim().length < 3}
                              onClick={() =>
                                mutate(`users/${detail.id}/status`, {
                                  status: s,
                                  reason: note,
                                })
                              }
                            >
                              {labels[s]}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </section>
        </div>
      )}
      {form && (
        <div className="modal-backdrop">
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Редактирование"
            onSubmit={(e) => {
              e.preventDefault();
              if (form.kind === "admin")
                mutate("admins", {
                  email: form.email,
                  password: form.password,
                  role: form.role,
                });
              else {
                const { id, kind, createdAt, updatedAt, ...body } = form;
                mutate(
                  id ? `categories/${id}` : "categories",
                  body,
                  id ? "PATCH" : "POST",
                );
              }
            }}
          >
            <div className="modal-heading">
              <h2>
                {form.kind === "admin" ? "Участник команды" : "Категория"}
              </h2>
              <button
                type="button"
                className="icon-btn"
                aria-label="Закрыть"
                onClick={() => setForm(null)}
              >
                ×
              </button>
            </div>
            {error && <ErrorNotice message={error} />}
            {form.kind === "admin" ? (
              <>
                <label>
                  Email
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </label>
                <label>
                  Пароль
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                </label>
                <label>
                  Роль
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    {Object.entries(roles).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <>
                {["slug", "nameRu", "nameKy"].map((k, i) => (
                  <label key={k}>
                    {
                      [
                        "Ключ категории",
                        "Название на русском",
                        "Название на кыргызском",
                      ][i]
                    }
                    <input
                      required
                      minLength={2}
                      maxLength={k === "slug" ? 40 : 60}
                      value={form[k]}
                      onChange={(e) =>
                        setForm({ ...form, [k]: e.target.value })
                      }
                    />
                  </label>
                ))}
                <label>
                  Публикация фото
                  <select
                    value={form.publicationPolicy}
                    onChange={(e) =>
                      setForm({ ...form, publicationPolicy: e.target.value })
                    }
                  >
                    <option value="standard">Стандартная</option>
                    <option value="restricted_photo">
                      Запрет публичного фото
                    </option>
                    <option value="official_handover">
                      Передача организации
                    </option>
                  </select>
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={form.sensitive || false}
                    onChange={(e) =>
                      setForm({ ...form, sensitive: e.target.checked })
                    }
                  />
                  Чувствительная категория
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={form.active ?? true}
                    onChange={(e) =>
                      setForm({ ...form, active: e.target.checked })
                    }
                  />
                  Активна
                </label>
              </>
            )}
            <button className="primary wide" disabled={busy}>
              {busy ? "Сохраняем…" : "Сохранить"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
