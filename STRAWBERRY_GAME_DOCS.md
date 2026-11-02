# 🍓 Strawberry Game — резюме та повна документація

> Документ складено на основі аналізу вихідного коду проєкту **Strawberry Game** (Vue 3 / TypeScript / Vite). Бекенд доступний за адресою REST API (`https://sapi.memories-app.org/`).

---

## Частина 1. Резюме

### Що це
**Strawberry Game** — це **Telegram Mini App** (WebApp) та веб-гра, клікер-ідл гра в піксельному стилі з економікою «полуниці → монети → бізнеси → виробництво складних предметів», системою рівнів (XP) та 2D міні-грою.

### Ігровий цикл
1. Гравець **клікає по полуниці** → отримує полуниці (базовий ліміт **200 кліків на 6 годин**, розширюється на **+100 кліків за кожен рівень**).
2. Полуниці та вироблені ресурси **продає** в інвентарі → отримує **монети**.
3. На монети **купує бізнеси** (магазин), які пасивно **генерують ресурси** (соки, варення, пироги, воду) за таймером.
4. Бізнеси **збирає** (collect) → дохід і досвід (XP) ростуть.
5. Заробляє **досвід (XP)** за купівлю бізнесів, збір врожаю та активність → **підвищує рівень**, відкриває нові бізнеси та збільшує ліміти клікеру.
6. Щодня заходить за **нагородою** (календар на 30 днів зі стріком).
7. Грає в **2D міні-гру** (`/game`) з дослідженням карти та збором предметів.
8. Взаємодіє з **павучком на павутинці** (фізичний маятник) → розгойдує та дьоргає павутинку, щоб забрати цукерку.
9. Змагається в **рейтингу гравців** (за монетами), запрошує друзів через реферальні посилання.

### Ключові характеристики

| Параметр | Значення |
|---|---|
| Платформа | Telegram Mini App (веб, мобільний вертикальний UI) + Web / Mobile Browser |
| Фронтенд | Vue 3.5 + TypeScript + Vite 6 + Pinia + Vue Router + vue-i18n |
| 2D Гра | Власний 2D Canvas Engine (`src/game/`): TileMap, Player, Pickups, Camera, Collisions |
| Бекенд | REST API (`https://sapi.memories-app.org/`), Bearer JWT авторизація |
| Мови | 🇬🇧 English, 🇺🇦 Українська, 🇷🇺 Русский |
| Стиль | Піксель-арт, власна 9-patch система рендерингу на Canvas + анімації частинок |
| Звук | WebAudio API (`/sfx/*.wav` — 40+ звукових ефектів: кліки, монетки, збір, успіх, обрив нитки) |
| Адмінка | Модульна адмін-панель (Користувачі, Бізнеси, Предмети, Чати/Сповіщення, Телеметрія) |
| Стан | Активна розробка / Релізна готовність |

### Сильні сторони
- Багатий ігровий процес: клікер, пасивні бізнеси, виробничі ланцюжки (соки, варення, пироги), система рівнів та XP, 2D міні-гра.
- Фізика інтерактивних елементів (маятник павучка з резинкою Гука, підтримка гіроскопа/нахилу пристрою).
- Оптимістичні кліки з пакетною відправкою (батчинг кожні 2 с) та анімаціями польоту частинок (полунички, монетки, предмети) до елементів тулбара.
- Власний піксельний UI-кіт (`NinePatch`, кнопки, модалки, тости, прелоадер текстур).
- Повна локалізація (EN, UK, RU), інтегрована веб-авторизація (Google Auth) та розширена модульна адмінка.

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
| HTTP | Axios 1.x (BaseURL: `https://sapi.memories-app.org/`) |
| Telegram | `vue-tg` + `telegram-web-app.js` |
| Веб-авторизація | Google Auth Service (`@/services/googleAuth.ts`) |
| Іконки | `@iconify/vue` + `pixelarticons` |
| Прапори | `pixel-flags` (+ CDN jsDelivr / flagcdn) |
| Шрифти | Crumbline, Monocraft (локально), Press Start 2P, VT323 (Google Fonts) |

### 2.2 Запуск

```sh
npm install
npm run dev          # dev-сервер (автовідкриття браузера)
npm run build        # type-check + production build
npm run type-check   # перевірка типів vue-tsc
npm run preview      # перегляд продакшн збірки
```

> Для роботи в Telegram гра відкривається через Telegram WebApp SDK. Поза Telegram підтримується веб-вхід (`WebLoginModal.vue` / Google Auth) або тестовий акаунт.

### 2.3 Структура проєкту

```
strawberry/
├── index.html                # Підключає Telegram SDK, шрифти, favicons
├── vite.config.ts            # alias "@" → src
├── public/
│   ├── sfx/                  # 40+ SFX аудіофайлів (.wav)
│   ├── items/                # Іконки предметів (strawberry, money, water, blueberry, jam, pie…)
│   ├── ui/                   # Піксельні текстури (кнопки, картки, 9-patch *.9.png, spider, web)
│   └── new_background.png    # Фон головного екрану
└── src/
    ├── main.ts               # Ініціалізація Pinia, Router, i18n, VueTelegramPlugin
    ├── App.vue               # Головний контейнер
    ├── router/index.ts       # Маршрути: / , /game , /pixel-ui , /privacy , /delete-account
    ├── views/                # HomeView, GameView, ShowPixelUiView, PrivacyView, DeleteAccountView
    ├── game/                 # 2D Ігровий рушій (Game, TileMap, Player, Pickup, Camera, Collision)
    ├── components/           # Секції гри
    │   ├── admin/            # Модульна адмінка (AdminUsers, AdminBusinesses, AdminItems, AdminChats, AdminTelemetry)
    │   ├── pixel/            # Піксельний UI-кіт (30+ компонентів)
    │   └── ...               # ClickerSection, InventorySection, BussinesSection, MarketSection, PlayersSection, WikiSection, DailyRewardsModal, WebLoginModal, ProfileModal, AnnouncementModal
    ├── stores/               # auth, user, toast, game
    ├── services/             # api, sound, googleAuth, texturePreloader
    ├── utils/                # business.ts
    ├── types/                # User, Business, Slot, Item, UserBusiness, DailyReward, InvitedUser
    └── locales/              # en.json, uk.json, ru.json
```

### 2.4 Архітектура та потік даних

```
Telegram WebApp / Google Auth ──▶ HomeView
                                      │ POST /auth/telegram (або Google Auth)
                                      ▼
                              auth.login(token) + user.setUser(data)
                                      │
        ┌──────────── Pinia (user store) ◀──── GET /users/me
        │
  Секції (Clicker / Inventory / Business / Shop / Top / Wiki / Admin …)
        │  axios + Bearer-токен (interceptor)
        ▼
  REST API (sapi.memories-app.org)
```

### 2.5 Екрани та функції

Нижня навігація (`BottomNavigation`): **Game · Inventory · Business · Shop · Top** (+ **Admin** для адміністраторів).

#### 🎮 Clicker (`ClickerSection`) — головний екран
- Велика полуниця; кожен клік: звук збору (`click-wood-1.wav`), анімація натискання, анімована частинка з ефектом польоту в тулбар до лічильника полуниць.
- **Динамічний ліміт кліків:** залежить від рівня гравця за формулою:
  $$\text{MaxDailyClicks}(L) = 200 + (L - 1) \times 100$$
  *(1 рівень — 200, 2 рівень — 300, 5 рівень — 600, 10 рівень — 1100)*.
- При вичерпанні ліміту показується картка із зворотним відліком до скидання (6-годинні інтервали).
- **Батчинг:** кліки відправляються пачками кожні 2 секунди через `POST /slots/take {name: 'strawberry', count}`.

#### 🕷️ Фізика Павучка (`HomeView.vue`)
- На верхній павутині висить павучок на павутинці.
- Реалізовано фізичний маятник з пружною ниткою (резинка Гука), реакцією на нахил пристрою (гіроскоп / DeviceOrientation) та затисканням пальцем.
- 33% шанс, що павучок тримає цукерку (`candy`).
- Дьоргання нитки 5 разів або сильне відтягування викликає **обрив нитки** (`snap` SFX), павучок відлітає вгору, а гравець отримує цукерку в інвентар (`POST /slots/take {name: 'candy', source: 'spider'}`).

#### 🎒 Inventory (`InventorySection`)
- Сітка 3 колонки зі слотами `іконка · ×кількість · назва`.
- При виборі предмета відкривається розсувна панель продажу з кнопками швидкостей (`-100, -10, -1, +1, +10, +100`).
- Продаж супроводжується анімацією польоту золотих монет до тулбару та звуком `coin.wav`.

#### 🏭 Business (`BussinesSection`) — мої бізнеси
- Список куплених бізнесів, відсортований за сумарним доходом.
- Показує накопичений ресурс (`accumulatedYield`) та позначку **MAX (7d)**.
- Локальний таймер зворотного відліку до наступного збору.
- При зборі створюються летючі анімовані предмети до кнопки інвентарю.

#### 🛒 Shop (`MarketSection`)
- Список бізнесів для купівлі з вимогами щодо рівнів (`minLevel`) та Premium-статусу.
- Динамічне зростання ціни купівлі для кожної наступної копії:
  $$\text{Price}(N) = \text{BasePrice} \times 1.15^N$$

#### 🕹️ 2D Міні-гра (`GameView.vue` + `src/game/`)
- Доступна за маршрутом `/game`.
- Повноцінний 2D-рушій на HTML5 Canvas: тайлова карта (`TileMap`), управління персонажем (`Player`), підбираємі предмети (`Pickup`), камери, обробка колізій.

#### 📖 Вікі предметів (`WikiSection.vue`)
- Інтерактивна довідка за всіма предметами гри з їх описом, іконками, цінами купівлі та продажу.

#### 🎁 Daily Rewards (`DailyRewardsModal`)
- Календар на **30 днів** зі стріком. Нагороди: полуниці, монети, скрині, варення, бусти.

#### 🛡️ Модульна Адмін-панель (`src/components/admin/`)
- **`AdminUsersSection`**: пошук гравців, бани/розбани, скидання 6-годинного ліміту, зміна рівнів ($L$) та XP, редагування ресурсів.
- **`AdminBusinessesSection`**: перегляд та редагування конфігурацій бізнесів.
- **`AdminItemsSection`**: керування предметами та цінами.
- **`AdminChatsSection`**: оголошення та системні сповіщення.
- **`AdminTelemetrySection`**: глобальна аналітика та статистика кліків.

---

### 2.6 Система рівнів та досвіду (XP)

Механіка детально описана у `LEVEL_SYSTEM_DOCS.md`.

#### Формула необхідного XP для переходу $L \rightarrow L+1$:
$$\text{XP}_{\text{needed}}(L) = 100 \times L + 50 \times L^2$$

| Рівень ($L$) | Потрібно XP | Поріг для наступного |
| :---: | :---: | :---: |
| **1** | **150 XP** | Lvl 2 |
| **2** | **400 XP** | Lvl 3 |
| **3** | **750 XP** | Lvl 4 |
| **5** | **1 750 XP** | Lvl 6 |
| **10** | **6 000 XP** | Lvl 11 |

#### Джерела нарахування XP:
1. **Купівля бізнесів**: $\text{XP} = \max\left(10, \left\lfloor \frac{\text{DynamicPrice}}{100} \right\rfloor \right)$.
2. **Збір прибутку**: $\text{XP} = \text{IntervalsPassed} \times \text{BusinessCount} \times 2$.
3. **Продаж предметів / Клікер**: додає досвід пропорційно до обсягу дій.

---

### 2.7 Економічний баланс предметів та бізнесів

Деталізовано у `balance.md`.

#### Каталог предметів (`items`)
- `strawberry` (Полуниця) — продається за **1 💰**
- `money` (Монети) — базова валюта
- `water` (Вода) — ресурс
- `blueberry` (Чорниця) — продається за **2 💰**
- `strawberry_juice` (Полуничний сік) — продається за **5 💰**
- `cherries` (Вишні) — продаються за **5 💰**
- `jam_cherry` (Вишневе варення) — продається за **20 💰**
- `blueberry_jam` (Чорничне варення) — продається за **30 💰**
- `blueberry_pie` (Чорничний пиріг) — продається за **80 💰**
- `strawberry_pie` (Полуничний пиріг) — продається за **120 💰**
- `candy` (Цукерка) — вибивається з павучка

#### Основні бізнеси та вимоги рівнів

| Бізнес (`name`) | Назва | Предмет | Мін. рівень (`minLevel`) |
| :--- | :--- | :---: | :---: |
| `garden_business` | Сад | `strawberry` | **Lvl 1** |
| `garden_bed` | Грядка | `strawberry` | **Lvl 1** |
| `strawberry_farm` | Полунична ферма | `strawberry` | **Lvl 1** |
| `strawberry_juice_factory` | Сокова фабрика | `strawberry_juice` | **Lvl 2** |
| `factory` | Фабрика | `strawberry` | **Lvl 2** |
| `water_tower` | Водонапірна вежа | `water` | **Lvl 2** |
| `blueberry_grove` | Чорничний гай | `blueberry` | **Lvl 3** |
| `cherry_orchard` | Вишневий сад | `cherries` | **Lvl 5** |
| `cherry_jam_factory` | Вишнева варильня | `jam_cherry` | **Lvl 5** |
| `blueberry_jam_factory` | Чорнична варильня | `blueberry_jam` | **Lvl 8** |
| `blueberry_pie_bakery` | Чорнична кондитерська | `blueberry_pie` | **Lvl 10** |
| `strawberry_pie_bakery` | Полунична кондитерська | `strawberry_pie` | **Lvl 12** |

---

### 2.8 Звукова система (`SoundEngine`)

Замість відсутніх фонових звуків реалізовано повний пакунок SFX на WebAudio API (`/sfx/*.wav`):
- `tab` — перемикання вкладок (`tab-switch-1.wav`)
- `click` — натискання кнопок (`click-wood-1.wav`)
- `harvest` — клікер полуниці (`/click.mp3`)
- `purchase` — купівля в магазині (`confirm-1.wav`)
- `coin` — отримання монет/продаж (`coin.wav`)
- `success` / `error` — сповіщення тостів
- `popupOpen` / `popupClose` — модальні вікна
- `pluck` — дьоргання нитки павутини (`click-bubble-1.wav`)
- `snap` — обрив павутинки (`error-2.wav`)
- `itemGet` — забрання цукерки (`item-get.wav`)

---

### 2.9 Довідник REST API

| Метод | Шлях | Призначення |
|---|---|---|
| POST | `/auth/telegram` | Авторизація через Telegram WebApp |
| GET | `/users/me` | Дані поточного користувача |
| GET | `/users` | Топ гравців |
| GET | `/users/daily-rewards` | Стан календаря щоденних нагород |
| POST | `/users/daily-rewards/claim` | Отримати щоденну нагороду |
| GET | `/slots/count` | Кількість предметів за назвою |
| POST | `/slots/take` | Батч кліків або вибивання цукерки з павука |
| POST | `/items/sell` | Продаж вказаної кількості предмета |
| POST | `/items/sell-all` | Продаж усіх предметів вибраного типу |
| GET | `/items` | Список усіх предметів для Вікі |
| GET | `/business` | Каталог бізнесів у магазині |
| POST | `/business/buy` | Купівля бізнесу |
| POST | `/business/collect` | Збір накопичених ресурсів |
| GET | `/notifications/active` | Перевірка активного оголошення |
| POST | `/admin/users/{id}/resources` | Зміна ресурсів, рівнів та XP користувача |

---

### 2.10 Вирішені та актуальні питання

**Вирішені проблеми:**
1. ✅ **SFX ассети**: Завантажено повноцінний комплект з 40+ SFX аудіофайлів у `/public/sfx/`.
2. ✅ **Динамічний ліміт кліків**: Хардкод 200 замінено на розрахунок за рівнем гравця ($200 + (L-1) \times 100$).
3. ✅ **URL API**: Оновлено на актуальний `https://sapi.memories-app.org/`.
4. ✅ **Модульність адмінки**: Адмін-панель розбита на 5 структурованих підкомпонентів.
5. ✅ **Веб-авторизація та Документи**: Додано підтримку входу через Google (`WebLoginModal`), а також сторінки приватності (`/privacy`) та видалення акаунту (`/delete-account`).

---

*Документ оновлено відповідно до поточного стану проєкту.*
