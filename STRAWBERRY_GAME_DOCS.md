# 🍓 Strawberry Game — резюме та повна документація

> Документ складено на основі аналізу вихідного коду архіву `strawberry.zip` (156 файлів, ~7 300 рядків TS/Vue). Бекенд у архіві **відсутній** — опис API реконструйовано з викликів на клієнті.

---

## Частина 1. Резюме

### Що це
**Strawberry Game** — це **Telegram Mini App** (WebApp), клікер-ідл гра в піксельному стилі з економікою «полуниці → монети → бізнеси».

### Ігровий цикл
1. Гравець **клікає по полуниці** → отримує полуниці (ліміт **200 кліків на 6 годин**).
2. Полуниці **продає** в інвентарі → отримує **монети**.
3. На монети **купує бізнеси** (магазин), які пасивно **генерують ресурс** за таймером.
4. Бізнеси **збирає** (collect) → дохід росте.
5. Щодня заходить за **нагородою** (календар на 30 днів зі стріком).
6. Змагається в **рейтингу гравців** (за монетами), запрошує друзів через реферальні посилання.

### Ключові характеристики

| Параметр | Значення |
|---|---|
| Платформа | Telegram Mini App (веб, мобільний вертикальний UI) |
| Фронтенд | Vue 3.5 + TypeScript + Vite 6 + Pinia + Vue Router + vue-i18n |
| Бекенд | Зовнішній REST API (`https://strawberryapi.dangerous.pp.ua/`), схоже на Java/Spring (`java.time.Duration` у типах, `Bearer` JWT) |
| Мови | 🇬🇧 English (за замовчуванням), 🇺🇦 Українська, 🇷🇺 Русский |
| Стиль | Піксель-арт, власна 9-patch система рендерингу на canvas |
| Звук | WebAudio API (SFX; музика — лише перемикач, не реалізована) |
| Адмінка | Вбудована, видима лише для `admin: true` |
| Стан | Прототип / активна розробка (є заглушки та недороблені місця) |

### Сильні сторони
- Чітка структура: сторінка → секції → UI-кіт → сервіси → стори.
- Оптимістичні кліки з пакетною відправкою (батчинг кожні 2 с) — економить мережу.
- Власний піксельний UI-кіт (NinePatch, кнопки, модалки, тости, прелоадер текстур).
- Повна локалізація, інтегрована адмін-панель з телеметрією.

### Головні ризики (коротко)
- ⚠️ **Відсутні ассети** `/honeywood/*` (звуки, текстури панелей) та `default-avatar.png`, `money_v2.png`, `/strawberry.png` → 404 і **немає жодного звуку** (SFX грузяться з `/honeywood/sounds/`, у архіві є лише `click.mp3`).
- ⚠️ `navigator.sendBeacon("/api/slots/take")` — хибний URL (без домену API й без токена).
- ⚠️ Жорстко зашиті `baseURL`, шлях до WebStorm у `vite.config.ts`, ліміт `200`.
- ⚠️ Роутер-гард авторизації повністю закоментований; безпека цілком на бекенді.
- ⚠️ Авторизація довіряє `initDataUnsafe` (див. розділ «Безпека»).

---

## Частина 2. Повна документація

### 2.1 Технологічний стек

| Шар | Технології |
|---|---|
| Фреймворк | Vue 3.5 (`<script setup>`, Composition API) |
| Мова | TypeScript ~5.8 |
| Збірка | Vite 6, `vite-plugin-vue-devtools`, `vue-tsc` |
| Стан | Pinia 3 + `pinia-plugin-persistedstate` |
| Роутинг | Vue Router 4 (history mode) |
| i18n | vue-i18n 11 (legacy: false) |
| HTTP | Axios 1.x |
| Telegram | `vue-tg` + `telegram-web-app.js` |
| Іконки | `@iconify/vue` + `pixelarticons` |
| Прапори | `pixel-flags` (+ CDN jsDelivr / flagcdn) |
| Шрифти | Crumbline, Monocraft (локально), Press Start 2P, VT323 (Google Fonts) |

### 2.2 Запуск

```sh
npm install
npm run dev          # dev-сервер (автовідкриття браузера)
npm run build        # type-check + production build
npm run type-check   # лише vue-tsc
npm run preview      # перегляд збірки
```

> Для повноцінної роботи гра має відкриватися **всередині Telegram**. Поза Telegram `initDataUnsafe.user` порожній і підставляється **тестовий користувач** (`id: 1`, «Тест Акк»).
> У `vite.config.ts` зашитий Windows-шлях до WebStorm (`D:\apps\ide\WebStorm\...`) — на інших машинах змініть/приберіть.
> Для локального бекенду в `src/services/api.ts` є закоментований `http://localhost:9090/`.

### 2.3 Структура проєкту

```
strawberry/
├── index.html                # Підключає Telegram SDK, шрифти, favicons
├── vite.config.ts            # alias "@" → src, автооткриття, WebStorm
├── public/
│   ├── ui/                   # 43 піксельні текстури (кнопки, картки, 9-patch *.9.png)
│   ├── favicons/, favicon.ico
│   ├── click.mp3             # звук збору полуниці
│   └── new_background.png    # фон головного екрану
└── src/
    ├── main.ts               # Ініціалізація: pinia(+persist), router, i18n, vue-tg
    ├── App.vue               # ExpandedViewport + вимкнені вертикальні свайпи
    ├── router/index.ts       # / , /pixel-ui , 404
    ├── views/                # HomeView, ShowPixelUiView, NotFoundView
    ├── components/           # Секції гри (див. 2.5)
    │   ├── pixel/            # Піксельний UI-кіт (30 компонентів)
    │   └── ui/               # Альтернативний «App*» UI-кіт (Honeywood-стиль)
    ├── stores/               # auth, user, toast
    ├── services/             # api, sound, texturePreloader
    ├── types/                # User, Slot, Item, Business, UserBusiness, DailyReward, InvitedUser
    ├── locales/              # en.json, uk.json, ru.json (по 219 рядків)
    └── assets/               # main.css, base.css, шрифти
```

### 2.4 Архітектура та потік даних

```
Telegram WebApp ──initDataUnsafe──▶ HomeView
                                      │ POST /auth/telegram
                                      ▼
                              auth.login(token) + user.setUser(data)
                                      │
        ┌──────────── Pinia (user store) ◀──── GET /users/me (оновлення при зміні вкладки)
        │
  Секції (Clicker / Inventory / Business / Market / Players / Admin …)
        │  axios + Bearer-токен (interceptor)
        ▼
  REST API (strawberryapi.dangerous.pp.ua)
```

**Принципи:**
- **Єдине джерело правди** — `userStore.user` (слоти, бізнеси, ліміти, стрік). Після кожної дії секції викликають `fetchUser()`.
- **Оптимістичні оновлення** лише для кліків (локально `+1` полуниця, `−1` ліміт).
- **Вкладки** — не роути, а `v-show` в `HomeView` (усі секції змонтовані одночасно; при зміні вкладки робиться `fetchUser()`).

### 2.5 Екрани та функції

Нижня навігація (`BottomNavigation`): **Game · Inventory · Business · Shop · Top** (+ **Admin** для адмінів). Налаштування відкриваються кнопкою в тулбарі; вкладки `profile` і `debug` існують у коді, але в навігації **немає** кнопок для них.

#### 🎮 Clicker (`ClickerSection`) — головний екран
- Велика полуниця; кожен клік: звук, анімація «pop», частинка `+1`, локально `+1` полуниця.
- **Ліміт: 200 кліків / 6 год.** (`remainingDailyClicks`, `nextClickResetTime` з сервера). Якщо ліміт вичерпано — полуниця блокується (замок), клік показує toast, внизу картка з таймером `HH:MM:SS` до скидання. Якщо сервер не дав час — fallback на найближче кратне 6 годин.
- **Батчинг:** кліки копляться в `pendingClicks` і кожні **2 с** відправляються `POST /slots/take {name:'strawberry', count}`. При помилці лічильник скидається і стан перезавантажується з сервера.
- Кнопка «Sell All» **закоментована** (продаж — в Інвентарі).

#### 🎒 Inventory (`InventorySection`)
- Сітка 3 колонки зі слотами `іконка · ×кількість · назва`.
- Вибір слоту → панель продажу: швидкі кнопки `1 / 10 / 100 / Sell All`, слайдер, лічильник `N / total`.
- Якщо кількість ≥ усього запасу → `POST /items/sell-all`, інакше `POST /items/sell {name, amount}`. **Монети (`money`, `money_v2`) продавати не можна.**
- Іконки: `strawberry`, `money`, `money_v2`, `strawberry_jam`, `*chest*` (спільна іконка магазину), інше — полуниця.

#### 🏭 Business (`BussinesSection`) — мої бізнеси
- Список, відсортований за сумарним доходом ↓ → ціна ↓ → базовий дохід ↓ → id ↓.
- Дохід = `yieldCount × count`. Показує накопичене (`accumulatedYield`) і тег **MAX (7d)** — накопичення обмежене 7 днями.
- Таймер до збору: бере `nextCollectInSeconds`, інакше рахує `usedAt + yieldInterval.seconds`. Тікає локально раз на секунду.
- `POST /business/collect {name}`; помилки «wait / collecting exception» мапляться на повідомлення про ліміт.

#### 🛒 Shop (`MarketSection`)
- `GET /business` → список бізнесів до купівлі, сортування за ціною ↑ → доходом ↑ → id.
- `POST /business/buy {name}`; помилки «not enough money», «not found» локалізуються.
- Назви бізнесів: `garden_bed`, `garden_business` (+ історичні помилки написання `bussines/bussiness`), `strawberry_farm`, `bakery`, `factory`. Нормалізація опечаток є в `formatBizName`.

#### 🏆 Top (`PlayersSection`)
- `GET /users` → рейтинг; порядок — **як віддає сервер** (клієнтського сортування немає), топ-3 підсвічені золотом/сріблом/бронзою. Показує аватар, ім'я (з піксельними прапорами), Premium-бейдж, кількість монет.

#### 👤 Profile (`ProfileSection`) — не підключена до навігації
- Аватар, ім'я, Premium/Banned, біо, кількість полуниць, сітка інвентарю, список запрошених (`GET /users/me/invites`).

#### ⚙️ Settings (`SettingsSection`)
- Мова (стрілки ◀ ▶), перемикачі звуку й музики, «Save» (зберігає в `localStorage`, закриває екран).
- Для українських користувачів (за Telegram/профілем/браузером) **російська прихована** зі списку.

#### 🎁 Daily Rewards (`DailyRewardsModal`)
- Календар на **30 днів**, стрік 1–30. Показує вікно з 6 найближчих днів (`streak … streak+5`), прогрес-бар, стан «отримано / поточний / заблоковано», «віхи» на днях **7, 14, 21, 28, 30**.
- `GET /users/daily-rewards` при відкритті; `POST /users/daily-rewards/claim {day}` для отримання.
- Модалка автоматично відкривається при вході, якщо `canClaimDaily`. На іконці 🎁 в тулбарі — червона крапка.
- **Нагороди** (локалізовані описи): 50–300 полуниць, монети (300–750 на звичайні дні; віхи +2000 / +3500 / +5000 / +7500 / +15 000), скрині (Gardener's, Super, Mega, Hyper, Royal), варення, бусти кліків (+100…+250, x2/x3 на 30 хв), Business Boost, «Legendary Trophy» на день 30.
- ⚠️ UI відображає лише `strawberries` і `coins` з відповіді API; предметні нагороди (скрині, варення, бусти) у карточках не показуються — їх опис є тільки в локалізації.

#### 🛡️ Admin (`AdminSection`) — тільки `user.admin === true`
- Статистика: гравці, забанені, сумарні монети/полуниці/бізнеси.
- Глобальна **телеметрія кліків**: усього, сьогодні, середнє на кліка/на батч.
- Пошук гравців (ім'я або Telegram ID), 6 способів сортування.
- Дії над гравцем: **Ban/Unban, Reset 6h limit, Edit resources, Telemetry, Toggle admin, Toggle premium (PRO)**.
- Модалка ресурсів: монети, полуниці, рівень; режим «встановити точно» / «додати до поточного».
- ⚠️ Деякі тексти адмінки зашиті українською (`Ніколи`, `Онлайн`, `хв тому`).

#### 🧰 Debug / Showcase
- `DebugSection` (вкладка `debug`, недоступна з навігації) — JSON Telegram-юзера, `start_param`, лінк на `/pixel-ui`.
- `/pixel-ui` (`ShowPixelUiView`, ~590 рядків) — вітрина піксельного UI-кіту, демо-екрани.

### 2.6 Стейт-менеджмент (Pinia)

| Store | Призначення | Персист |
|---|---|---|
| `auth` | `token`, `roles`; `login()` приймає рядок або `{token}`, **відкидає токен із не-ASCII символами**; `logout()`, `hasRole()` | ✅ |
| `user` | `user`, `isLoading`, `dailyRewardsStatus`; computed: `money`, `strawberries`, `remainingDailyClicks` (дефолт 200), `nextClickResetTime`, `dailyStreak` (дефолт 1), `canClaimDaily`; дії: `fetchUser`, `setUser`, `decrementRemainingClicks`, `setRemainingClicks`, `addStrawberries`, `addMoney`, `addItemToSlot`, `fetchDailyRewards`, `claimDailyReward` | ❌ |
| `toast` | Черга тостів `success / error / info`, автозакриття 3 с | ❌ |

### 2.7 Сервіси

- **`api.ts`** — axios, `baseURL = https://strawberryapi.dangerous.pp.ua/`, таймаут 10 с. Interceptor додає `Authorization: Bearer <token>`; при невалідному (не-ASCII) токені робить `logout()`.
- **`sound.ts`** — `SoundEngine` на WebAudio: попереднє декодування буферів, `playSound(key, volume)`. Ключі: `tab`, `click`, `harvest` (`/click.mp3`, гучність 0.25), `purchase`, `coin`. Налаштування `sound_enabled` / `music_enabled` у `localStorage`. **Фонова музика не реалізована** — лише прапорець.
- **`texturePreloader.ts`** — попереднє завантаження ~43 текстур UI у кеш `Map` при старті.

### 2.8 Піксельний UI-кіт (`components/pixel`)

| Група | Компоненти |
|---|---|
| Контейнери | `Card`, `CardPrimary`, `Selected`, `AvatarBorder`, `Message`, `PixelModal` (Teleport, Esc/клік по фону) |
| Кнопки | `PixelButton`, `ButtonText`, `GameButton`, `ShopButton`, `InventoryButton`, `BusinessButton`, `TopButton`, `AdminButton`, `SettingsButton`, `CloseButton`, `OkButton`, `HelpButton`, `Left/RightButton`, `Sound/MusicButton` (+ дублі `ButtonSound/ButtonMusic`) |
| Інше | `Switch`, `Loading` (спрайт-анімація 37 кадрів), `Lock`, `Image`, `PremiumBadge`, `PixelText` (заміна emoji-прапорів на піксельні SVG), `PixelToastContainer` |

**`NinePatch.vue`** — серце стилю: читає Android-стиль `*.9.png` (чорні 1px-лінії зверху/зліва задають зони розтягування), малює на `<canvas>` з урахуванням `devicePixelRatio`, `imageSmoothing=false`, перемальовується через `ResizeObserver`. Масштаб піксеня за замовчуванням ×2.

Окремо існує **`components/ui`** (`AppCard`, `AppText`, `AppScreen`, кнопки, `AppTextField`, `AppDropdown`) — старіший «Honeywood»-кіт, що спирається на `border-image` з відсутньої папки `/honeywood/`. Використовується лише в `ProfileSection` і `InvitedUserList`.

### 2.9 Типи даних

```ts
User { userId, telegramId, firstName, lastName, username?, photoUrl?, bio, lang,
       premium, banned, admin?, createAt, lastOnlineAt?,
       dailyStrawberryClicks?, remainingDailyClicks?, nextClickResetTime?,
       dailyStreak?, lastClaimedDailyAt?, canClaimDaily?,
       slots: Slot[], businesses: UserBusiness[], invites: InvitedUser[] }
Slot { id, item: {id, name}, count }
UserBusiness { id, count, usedAt, nextCollectAt?, nextCollectInSeconds?, canCollect?,
               accumulatedYield?, maxAccumulatedYield?,
               business: { id, name, yieldCount, yieldInterval: {seconds,nano,…}, item } }
Business { id, name, yieldCount, yieldInterval: string, item: string, price? }
DailyRewardStatus { streak, canClaim, days: DailyRewardDay[] }
DailyRewardDay { day, week, icon, rewardKey, title, strawberries, coins,
                 milestone, claimed, current, locked }
InvitedUser { id, telegramId, firstName, lastName, photoUrl }
```

**Валюти й предмети** — це «слоти» з `item.name`: `money` (монети), `strawberry`, `money_v2`, `strawberry_jam`, `chest_gardener|super|mega|royal`.

### 2.10 Довідник REST API (з клієнтського коду)

| Метод | Шлях | Тіло / параметри | Використання |
|---|---|---|---|
| POST | `/auth/telegram` | `telegram_id, photo_url, first_name, last_name, username, language_code, inviter_telegram_id (start_param)` | Вхід/реєстрація, повертає токен і користувача |
| GET | `/users/me` | — | Поточний користувач |
| GET | `/users` | — | Рейтинг гравців |
| GET | `/users/me/invites` | — | Запрошені друзі |
| GET | `/users/daily-rewards` | — | Статус календаря |
| POST | `/users/daily-rewards/claim` | `{day}` | Отримати нагороду |
| GET | `/slots/count` | `?name=strawberry` | Кількість предмета |
| POST | `/slots/take` | `{name, count}` | Батч кліків; відповідь: `count, remainingDailyClicks, nextClickResetTime` |
| POST | `/items/sell` | `{name, amount}` | Продаж частини; відповідь: `coinsEarned` |
| POST | `/items/sell-all` | `{name}` | Продаж усього |
| GET | `/business` | — | Магазин бізнесів |
| POST | `/business/buy` | `{name}` | Купівля |
| POST | `/business/collect` | `{name}` | Збір доходу |
| GET | `/admin/stats` | — | Статистика |
| GET | `/admin/telemetry` | — | Глобальна телеметрія |
| GET | `/admin/telemetry/user/{id}` | — | Телеметрія гравця |
| GET | `/admin/users` | `?search=` | Список гравців |
| POST | `/admin/users/{id}/ban` | — | Бан/розбан |
| POST | `/admin/users/{id}/toggle-admin` | — | Адмін-права |
| POST | `/admin/users/{id}/toggle-premium` | — | Premium |
| POST | `/admin/users/{id}/reset-limit` | — | Скинути ліміт кліків |
| POST | `/admin/users/{id}/resources` | `{money, strawberries, level, addMode}` | Редагування ресурсів |

### 2.11 Реферальна система
Формат посилання в коді не генерується (імовірно `t.me/<bot>?startapp=<telegram_id>`, бо `start_param` трактується як Telegram ID запрошувача): `start_param` передається як `inviter_telegram_id` при авторизації. Запрошені відображаються у профілі.

### 2.12 Локалізація
Три файли з однаковою структурою (219 рядків): `loading`, `inventory`, `clicker`, `admin`, `business`, `profile`, `items`, `players`, `settings`, `toolbar`, `modal`, `bottomNav`, `invite_list`, `not_found`, `daily_rewards`. Мова: `localStorage.lang` → інакше `en`; при вході перезаписується `language_code` з Telegram. Fallback — `en`.

### 2.13 Ассети

`public/ui` (43 файли): кнопки з парами normal/pressed, 9-patch (`card`, `primary_card`, `border`, `message`, `selected`, `button_text`), іконки `strawberry`, `money`, `lock`, `finger`, спрайт `loading.png`, перемикачі. Також `new_background.png` (~1 МБ) і `click.mp3`.

### 2.14 Виявлені проблеми та рекомендації

**Критичні / функціональні**
1. **Відсутні файли**: `/honeywood/sounds/*.ogg` (усі SFX крім `click.mp3`), `/honeywood/ui/*` (текстури `AppCard` і `main.css`), `/default-avatar.png`, `/ui/money_v2.png`, `/strawberry.png`, `/honeywood/icons/*`. Наслідок: 404, не працюють звуки `tab/click/purchase/coin`, зламані аватари за замовчуванням.
2. **`sendBeacon("/api/slots/take", …)`** шле на власний домен, а не на API, без `Authorization` і з неправильним Content-Type → невідправлені кліки при закритті втрачаються. Також `JSON.stringify` без `Blob` дає `text/plain`.
3. **`setInterval(flushClicks, 2000)`** створюється в `onMounted` без очищення в `onUnmounted`; `beforeunload`-слухач також не знімається.
4. Після помилки `flushClicks` обнуляє `pendingClicks` — кліки втрачаються без повтору.
5. `HomeView`: перевірка `user === undefined` ніколи не спрацьовує (є fallback-юзер), тож 404-редірект мертвий.
6. `ClickerSection`: при `isLimitReached` кліки блокуються на клієнті, але константа `200` захардкоджена в трьох місцях — треба брати з API.
7. Вкладки `profile` і `debug` недосяжні з UI.
8. `BusinessCard.vue` — порожній файл-заглушка. `DailyRewardsModal` не показує предметні нагороди.

**Безпека**
- `initDataUnsafe` не підписаний — клієнт передає `telegram_id` у відкритому вигляді. Бекенд **має** валідувати `initData` (HMAC за токеном бота) і не довіряти `telegram_id` з тіла, інакше можна видати себе за будь-кого (включно з адміном).
- Токен зберігається в `localStorage` (persist) — типово для Mini App, але вразливий до XSS.
- Усі адмін-перевірки мають бути на сервері; `isAdmin` на клієнті лише ховає кнопку.
- Dev-середовище: приватний шлях до IDE у `vite.config.ts`, `.env.local` містить лише `LAUNCH_EDITOR` (секретів немає).

**Якість коду**
- Дубльований код: `formatBizName` і `translateError` скопійовані між `BussinesSection` та `MarketSection` → винести в утиліту.
- Два паралельних UI-кіти (`pixel` + `ui`), дублі експортів (`Loading`/`PixelLoading`, `ButtonSound`/`SoundButton`).
- Назви з помилками: `BussinesSection`, `garden_bussines`, `DailyRewardsModal` «Reward Calendar».
- Мішані мови в коментарях/текстах (укр/англ), частина рядків зашита поза i18n (`Готово:`, `MAX (7d)`, адмінка).
- Логіка авторизації роутера закоментована; `README.md` — шаблонний («feature-tracker»), назва пакета `strawberry_game`.
- Додати `.env` для `baseURL`, перенести магічні числа в конфіг, додати тести й обробку `401`.

### 2.15 Ідеї для розвитку
Фонова музика (прапорець уже є), анімація зростання полуниць, досягнення/рівні (в адмінці вже є поле `level`), події «Business Boost» і бусти кліків з календаря нагород, скрині з лутом, сезонні рейтинги, push-нагадування про збір бізнесів і нагороду.

---

*Документ згенеровано автоматично за статичним аналізом коду; поведінка бекенду та значення економіки (ціни, дохід бізнесів) у клієнті відсутні і не включені.*
