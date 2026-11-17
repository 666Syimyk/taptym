# Проверка · 10 ноября 2026

Среда: Windows, Node.js 24.21.0, npm 11.19.0, Flutter 3.47.2 / Dart 3.13.2. Дата указана по Asia/Bishkek.

| Команда / проверка | Результат |
|---|---|
| Корневая `npm run check` | Успешно, exit 0 |
| Backend Prettier | Все проверенные файлы соответствуют форматированию |
| Backend ESLint / TypeScript | Успешно |
| Backend unit tests | 6 наборов, 20 тестов успешно |
| Backend API e2e | 1 набор, 14 тестов успешно |
| Flutter analyze | No issues found |
| Flutter widget tests | 5 тестов успешно |
| Корневая `npm run build` | Успешно, exit 0 |
| Backend NestJS build | Успешно, `backend/dist` |
| Admin TypeScript / Vite build | Успешно, `admin/dist` |
| Flutter release Web build | Успешно, `mobile/build/web` |
| OpenAPI export | Успешно, 79 путей в `docs/openapi.json` |
| `npm audit --omit=dev --audit-level=high` (backend) | 0 найденных уязвимостей в проверенных рабочих npm-зависимостях |
| Та же проверка admin | 0 найденных уязвимостей |
| Локальный API `/v1/health` | HTTP 200, `status=ok` |
| Панель `localhost:5173` | HTTP 200 |
| Запрос `/v1/categories` через proxy панели | HTTP 200 |
| Приложение `localhost:8080` | HTTP 200 |
| Swagger `/docs-json` | HTTP 200 |

Всего прошло 39 автоматических тестов. API e2e работает с настоящими NestJS, PGlite, sharp и WebSocket; Flutter widget tests используют тестовый сетевой адаптер. Мок проверки OTP relay подтверждает контракт и обработку ошибки, но не реальную доставку SMS/email.

Регрессии включают: отсутствие публичного доступа к непроверенному фото, отзыв публичной ссылки после снятия объявления, сохранение evidence при очистке orphan uploads, отклонение пустого evidence, отзыв REST/WS сессий и сохранение одноразового кода в мобильном экране после серверного обновления.

Не выполнялись: сборки/тесты Android и iOS, запуск Docker, удалённый CI, реальные Anthropic/OTP/S3/FCM-интеграции, нагрузка, независимый аудит и восстановление backup. Android SDK отсутствует; iOS требует macOS. Computer Use завершил попытку визуальной проверки, поскольку не смог надёжно определить URL браузера. HTTP-проверка не заменяет визуальную проверку.

Во время разработки выявлена несовместимость параллельных Flutter-запусков из разных subst-путей с общим генератором локализации. Финальные check/build выполнены последовательно. Корневые скрипты явно генерируют локализацию и временно используют свободную букву диска для пути с кириллицей.
