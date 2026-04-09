# Backend — PRG Batch System

## Стек

- **Runtime:** Node.js 22
- **Framework:** AdonisJS 6
- **База данных:** PostgreSQL (через Lucid ORM)
- **Realtime:** Socket.IO
- **Деплой:** Docker-контейнер `prg-api`, порт 3333

---

## Структура

```
api/
├── app/
│   ├── controllers/     # HTTP-обработчики
│   ├── models/          # Lucid-модели (ORM)
│   ├── services/        # WebSocket + Timer
│   ├── validators/      # Валидация входящих данных
│   └── helpers/         # Daypart (дейпарты)
├── database/
│   ├── migrations/      # Схема БД
│   └── seeders/         # Начальное меню
├── start/
│   ├── routes.ts        # Все HTTP-маршруты
│   ├── ws.ts            # WebSocket-логика (join, snapshot, события)
│   └── kernel.ts        # Middleware
└── config/
```

---

## Модели

### Ticket (тикет)

Одна единица работы — «приготовить батч X позиции Y на станции Z».

| Поле | Тип | Описание |
|---|---|---|
| `id` | number | PK |
| `station` | string | `stirfry` / `fryer` / `sides` / `grill` |
| `source` | string | `foh` / `drive_thru` — кто создал |
| `state` | enum | `created` → `started` → `completed` / `canceled` |
| `stationSeq` | number | Порядковый номер тикета за день на станции |
| `stationDay` | date | Дата (для сброса seq каждый день) |
| `startedAt` | datetime | Когда нажали Start |
| `durationSeconds` | number | Текущая длительность таймера (может быть изменена через extend) |
| `durationSnapshot` | number | Исходная длительность из меню — не меняется |
| `itemTitleSnapshot` | string | `"Orange Chicken (C1)"` — строка из меню на момент вызова |
| `batchSizeSnapshot` | string | `"1"` / `"2"` / `"3"` |
| `menuVersionAtCall` | number | Версия меню на момент создания тикета |
| `priority` | boolean | Приоритетный флаг (мигает красным в UI) |

### MenuItem (позиция меню)

| Поле | Тип | Описание |
|---|---|---|
| `code` | string | Уникальный код: `C1`, `B3`, `R1` и т.д. |
| `title` | string | Название блюда |
| `station` | enum | `stirfry` / `fryer` / `sides` / `grill` |
| `cookTimes` | JSON | `{ "1": 480, "2": 480, "3": 480 }` — секунды по батчу |
| `batchSizes` | JSON | `["1", "2", "3"]` |
| `recommendedBatch` | JSON | `{ "breakfast": "1", "lunch": "2", ... }` |
| `color` | enum | `blue` / `red` / `green` / `orange` / `yellow` / null |
| `holdTime` | number | Время хранения в секундах (по умолчанию 600 = 10 мин) |
| `ingredients` | JSON | Список ингредиентов |
| `allergens` | JSON | Аллергены |
| `nutrition` | JSON | Калории, белки, углеводы, жиры, вес порции |
| `imageUrl` | string | Путь к фото `/uploads/c1.png` |
| `enabled` | boolean | Можно ли создавать тикеты |

### MenuVersion

Одна строка в таблице. Число версии инкрементируется при каждом изменении меню. Клиенты подписываются на `menu_updated` и перезапрашивают меню.

---

## HTTP API

### Меню — `/api/menu`

| Метод | Путь | Что делает |
|---|---|---|
| GET | `/api/menu` | Все позиции + текущая версия |
| POST | `/api/menu` | Создать позицию (бампает версию, эмитит `menu_updated`) |
| PATCH | `/api/menu/:id` | Обновить позицию (бампает версию) |
| DELETE | `/api/menu/:id` | Удалить позицию (бампает версию) |
| POST | `/api/menu/:id/image` | Загрузить фото (max 5 MB, jpg/png/webp) |
| DELETE | `/api/menu/:id/image` | Удалить фото |

### Тикеты — `/api/tickets`

| Метод | Путь | Что делает |
|---|---|---|
| GET | `/api/tickets?station=stirfry` | Список тикетов по станции |
| POST | `/api/tickets` | Создать тикет |
| POST | `/api/tickets/:id/start` | Запустить таймер |
| POST | `/api/tickets/:id/complete` | Завершить тикет |
| POST | `/api/tickets/:id/reset` | Сбросить таймер (начать заново) |
| POST | `/api/tickets/:id/extend` | Добавить секунды к таймеру (`seconds`, default 10) |
| POST | `/api/tickets/:id/priority` | Переключить приоритетный флаг |
| DELETE | `/api/tickets/:id` | Отменить тикет |

### Health

| Метод | Путь |
|---|---|
| GET | `/health` |
| GET | `/api/health` |

---

## Ограничения таймеров по станциям

Бэкенд не позволяет запустить больше N таймеров одновременно:

| Станция | Лимит |
|---|---|
| Fryer | ∞ (999) |
| Stir Fry | 2 |
| Sides | 1 |
| Grill | 1 |

При попытке превысить лимит — `400 Bad Request`.

---

## WebSocket

Подключение через Socket.IO на пути `/socket.io`.

### Комнаты

Клиент при подключении эмитит `join` с массивом комнат. Доступные комнаты:

**Станции:** `stirfry`, `fryer`, `sides`, `grill`  
**Источники:** `foh`, `drive_thru`

### События сервера → клиент

| Событие | Когда | Данные |
|---|---|---|
| `snapshot` | После `join` | Все активные тикеты + завершённые (последние 20) + `menuVersion` + `serverNowMs` |
| `ticket_created` | Создан тикет | Объект тикета |
| `timer_started` | Старт / сброс / extend | `{ ticketId, startedAt, durationSeconds }` |
| `timer_ended` | Таймер истёк | `{ ticketId }` |
| `ticket_completed` | Тикет завершён | Объект тикета |
| `ticket_cancelled` | Тикет отменён | Объект тикета |
| `ticket_priority_updated` | Изменён флаг приоритета | Объект тикета |
| `menu_updated` | Изменено меню | `{ version }` |
| `pong` | Ответ на `ping` | `{ serverNowMs }` |

### События клиент → сервер

| Событие | Данные |
|---|---|
| `join` | `string[]` — массив комнат |
| `ping` | — |

### Синхронизация времени

Клиент при подключении периодически эмитит `ping`, получает `pong` с `serverNowMs`. Вычисляет `offsetMs = serverNowMs - Date.now()`. Все расчёты таймеров ведутся через `(Date.now() - offsetMs)` — синхронизировано с сервером.

---

## Сервис Timer

Серверный шедулер на `setTimeout`. При старте тикета записывает `timeout` в `Map<ticketId, NodeJS.Timeout>`. Когда время истекает — эмитит `timer_ended` в Socket.IO-комнату станции.

При перезапуске сервера — `rescheduleOnBoot()` восстанавливает все активные таймеры из БД.

---

## Dayparts

Пять временных отрезков дня. Используются для `recommendedBatch` в меню.

| ID | Время |
|---|---|
| `breakfast` | 6:00 – 11:00 |
| `lunch` | 11:00 – 14:00 |
| `snack` | 14:00 – 17:00 (Downtime) |
| `dinner` | 17:00 – 20:00 |
| `late_snack` | 20:00 – 24:00 (Downtime) |

---

## Деплой

- Docker-образ собирается из `api/Dockerfile`
- Контейнер `prg-api`, слушает порт `3333`
- Переменные среды: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
- При старте контейнера автоматически прогоняются миграции
- Стек: `docker-compose.yml` в корне репозитория
- Живёт на `134.199.223.99`, доступен по `/api/*` через nginx-прокси
