<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import {
  Card, CardPrimary, PixelModal, AvatarBorder, Message,
  ShopButton, GameButton, SettingsButton, TopButton,
  CloseButton, OkButton, HelpButton, ButtonText, Switch
} from '@/components/pixel'

const router = useRouter()

/* ───────── Навігація сторінки ───────── */
type Tab = 'screens' | 'components' | 'type'
const tab = ref<Tab>('screens')

type Screen = 'farm' | 'shop' | 'top' | 'settings' | 'profile'
const screen = ref<Screen>('farm')

const screenList: { id: Screen; label: string; icon: string }[] = [
  { id: 'farm', label: 'Ферма', icon: 'pixelarticons:gamepad' },
  { id: 'shop', label: 'Магазин', icon: 'pixelarticons:store' },
  { id: 'top', label: 'Рейтинг', icon: 'pixelarticons:trophy' },
  { id: 'settings', label: 'Налаштування', icon: 'pixelarticons:sliders' },
  { id: 'profile', label: 'Профіль', icon: 'pixelarticons:user' },
]

/* ───────── Стан гри (демо) ───────── */
const coins = ref(1250)
const berries = ref(48)
const energy = ref(95)

const fmt = (n: number) => n.toLocaleString('uk-UA')

/* Грядки: 0 = порожньо, 1 = росте, 2 = готово */
const plots = ref<number[]>([2, 1, 2, 0, 1, 2, 2, 1, 0, 2, 1, 1])
const readyCount = computed(() => plots.value.filter(p => p === 2).length)

function tapPlot(i: number) {
  if (plots.value[i] === 2) {
    plots.value[i] = 0
    berries.value += 1
    coins.value += 5
  } else if (plots.value[i] === 0) {
    plots.value[i] = 1
    setTimeout(() => { plots.value[i] = 2 }, 2500)
  }
}
function harvestAll() {
  plots.value = plots.value.map(p => {
    if (p === 2) { berries.value += 1; coins.value += 5; return 0 }
    return p
  })
}

/* Магазин */
interface Biz { id: number; name: string; income: number; price: number; owned: number; img: string }
const shop = ref<Biz[]>([
  { id: 1, name: 'Полунична грядка', income: 2, price: 100, owned: 6, img: '/ui/strawberry.png' },
  { id: 2, name: 'Теплиця', income: 12, price: 900, owned: 2, img: '/ui/strawberry.png' },
  { id: 3, name: 'Ринок біля дороги', income: 55, price: 4200, owned: 0, img: '/ui/money.png' },
  { id: 4, name: 'Фабрика варення', income: 240, price: 18000, owned: 0, img: '/ui/money.png' },
])
const pending = ref<Biz | null>(null)
const modalOpen = ref(false)
const toast = ref('')

function askBuy(b: Biz) { pending.value = b; modalOpen.value = true }
function confirmBuy() {
  const b = pending.value
  if (!b) return
  modalOpen.value = false
  if (coins.value < b.price) { toast.value = `Не вистачає ${fmt(b.price - coins.value)} монет`; return }
  coins.value -= b.price
  b.owned++
  toast.value = `Куплено: ${b.name}`
}

/* Рейтинг */
const players: { rank: number; name: string; score: number; lvl: number; me?: boolean }[] = [
  { rank: 1, name: 'DragonSlayer', score: 2450000, lvl: 99},
  { rank: 2, name: 'PixelMaster', score: 1980500, lvl: 85},
  { rank: 3, name: 'ShadowNinja', score: 1420000, lvl: 78},
  { rank: 4, name: 'RangerAlex', score: 950000, lvl: 64},
  { rank: 5, name: 'PixelHero_UA', score: 420000, lvl: 42, me: true },
]

/* Налаштування */
const sfx = ref(true)
const music = ref(true)
const push = ref(false)
const auto = ref(true)
const saved = ref(false)
function save() { saved.value = true; setTimeout(() => (saved.value = false), 2200) }

/* ───────── Компоненти: пісочниця кнопки ───────── */
const btnText = ref('Зібрати')
const btnDisabled = ref(false)
const btnLoading = ref(false)
const btnActive = ref(false)
const btnAuto = ref(true)
const btnWidth = ref(180)
const clicks = ref(0)

const cardW = ref(320)
const cardPad = ref(16)
const cardFs = ref(16)
const msgClosable = ref(true)
const sw = ref(true)
const demoModal = ref(false)
</script>

<template>
  <div class="showcase">
    <!-- Модалка підтвердження покупки -->
    <PixelModal v-model="modalOpen" title="Купівля бізнесу" :width="340">
      <div v-if="pending" class="buy-modal">
        <AvatarBorder size="56" padding="5"><img :src="pending.img" class="px-img" alt="" /></AvatarBorder>
        <div>
          <div class="t-lg">{{ pending.name }}</div>
          <div class="t-sm muted">+{{ fmt(pending.income) }} монет / хв</div>
          <div class="t-md price"><img src="/ui/money.png" class="px-img s16" alt="" /> {{ fmt(pending.price) }}</div>
        </div>
      </div>
      <template #footer>
        <OkButton size="64" @click="confirmBuy" />
        <CloseButton size="64" @click="modalOpen = false" />
      </template>
    </PixelModal>

    <!-- Демо-модалка з вкладки «Компоненти» -->
    <PixelModal v-model="demoModal" title="Піксельне вікно" :width="320">
      <p class="t-md" style="margin:0">Вікно будується на CardPrimary із затемненим фоном.</p>
      <template #footer>
        <OkButton size="64" @click="demoModal = false" />
        <CloseButton size="64" @click="demoModal = false" />
      </template>
    </PixelModal>

    <!-- Шапка сторінки -->
    <header class="page-head">
      <button class="ghost-btn" @click="router.push('/')">
        <Icon icon="pixelarticons:arrow-left" /> Назад
      </button>
      <h1>Pixel UI</h1>
      <nav class="tabs">
        <button :class="{ on: tab === 'screens' }" @click="tab = 'screens'">Екрани гри</button>
        <button :class="{ on: tab === 'components' }" @click="tab = 'components'">Компоненти</button>
        <button :class="{ on: tab === 'type' }" @click="tab = 'type'">Шрифт</button>
      </nav>
    </header>

    <!-- ═════════ ЕКРАНИ ═════════ -->
    <section v-if="tab === 'screens'" class="screens-tab">
      <div class="screen-picker">
        <button
            v-for="s in screenList" :key="s.id"
            :class="{ on: screen === s.id }" @click="screen = s.id"
        >
          <Icon :icon="s.icon" /> {{ s.label }}
        </button>
      </div>

      <div class="phone">
        <div class="phone-screen">
          <!-- HUD -->
          <div class="hud">
            <div class="hud-name" style="cursor:pointer" @click="screen = 'profile'">
              <span class="t-md">PixelHero_UA</span>
              <span class="t-sm muted">Рівень 42</span>
            </div>
            <div class="hud-res">
              <span class="res"><img src="/ui/money.png" class="px-img s16" alt="" />{{ fmt(coins) }}</span>
              <span class="res"><img src="/ui/strawberry.png" class="px-img s16" alt="" />{{ fmt(berries) }}</span>
            </div>
          </div>

          <!-- Тіло екрана -->
          <main class="phone-body">
            <!-- ФЕРМА -->
            <template v-if="screen === 'farm'">
              <div class="field">
                <button
                    v-for="(p, i) in plots" :key="i"
                    class="plot" :class="['st-' + p]" @click="tapPlot(i)"
                >
                  <img v-if="p === 2" src="/ui/strawberry.png" class="px-img s32" alt="Готово" />
                  <span v-else-if="p === 1" class="sprout"></span>
                </button>
              </div>
              <Card width="100%" height="auto" :padding="14">
                <div class="row between">
                  <div>
                    <div class="t-lg">Готово до збору</div>
                    <div class="t-sm muted">{{ readyCount }} з {{ plots.length }} грядок</div>
                  </div>
                  <ButtonText :disabled="!readyCount" @click="harvestAll">Зібрати</ButtonText>
                </div>
                <div class="bar"><i :style="{ width: energy + '%' }"></i></div>
                <div class="t-sm muted">Енергія {{ energy }} / 100</div>
              </Card>
            </template>

            <!-- МАГАЗИН -->
            <template v-else-if="screen === 'shop'">
              <Message v-if="toast" title="Магазин" closable width="100%" @close="toast = ''">
                <p style="margin:0">{{ toast }}</p>
              </Message>
              <Card v-for="b in shop" :key="b.id" width="100%" height="auto" :padding="12">
                <div class="row gap">
                  <AvatarBorder size="56" padding="5"><img :src="b.img" class="px-img s32" alt="" /></AvatarBorder>
                  <div class="grow">
                    <div class="t-lg">{{ b.name }}</div>
                    <div class="t-sm muted">+{{ fmt(b.income) }} / хв · у вас {{ b.owned }}</div>
                    <div class="t-md price"><img src="/ui/money.png" class="px-img s16" alt="" />{{ fmt(b.price) }}</div>
                  </div>
                  <ButtonText :disabled="coins < b.price" @click="askBuy(b)">Купити</ButtonText>
                </div>
              </Card>
            </template>

            <!-- РЕЙТИНГ -->
            <template v-else-if="screen === 'top'">
              <CardPrimary width="100%" height="auto" :padding="14">
                <div class="podium">
                  <div class="pod p2">
                    <span class="t-md">{{ players[1].name }}</span>
                    <span class="t-sm muted">{{ fmt(players[1].score) }}</span>
                    <div class="step h2">2</div>
                  </div>
                  <div class="pod p1">
                    <Icon icon="pixelarticons:trophy" class="crown" />
                    <span class="t-md">{{ players[0].name }}</span>
                    <span class="t-sm muted">{{ fmt(players[0].score) }}</span>
                    <div class="step h1">1</div>
                  </div>
                  <div class="pod p3">
                    <span class="t-md">{{ players[2].name }}</span>
                    <span class="t-sm muted">{{ fmt(players[2].score) }}</span>
                    <div class="step h3">3</div>
                  </div>
                </div>
              </CardPrimary>
              <Card width="100%" height="auto" :padding="10">
                <div class="rank-list">
                  <div v-for="p in players" :key="p.rank" class="rank-row" :class="{ me: p.me }">
                    <span class="rank-n">{{ p.rank }}</span>
                    <div class="grow">
                      <div class="t-md">{{ p.name }}</div>
                      <div class="t-sm muted">Рівень {{ p.lvl }}</div>
                    </div>
                    <span class="res"><img src="/ui/money.png" class="px-img s16" alt="" />{{ fmt(p.score) }}</span>
                  </div>
                </div>
              </Card>
            </template>

            <!-- НАЛАШТУВАННЯ -->
            <template v-else-if="screen === 'settings'">
              <Message v-if="saved" title="Збережено" width="100%">
                <p style="margin:0">Налаштування оновлено.</p>
              </Message>
              <Card width="100%" height="auto" :padding="14">
                <div class="toggles">
                  <div class="toggle"><div><div class="t-lg">Звукові ефекти</div><div class="t-sm muted">Кліки та події</div></div><Switch v-model="sfx" /></div>
                  <div class="toggle"><div><div class="t-lg">Музика</div><div class="t-sm muted">Фоновий супровід</div></div><Switch v-model="music" /></div>
                  <div class="toggle"><div><div class="t-lg">Сповіщення</div><div class="t-sm muted">Коли врожай дозрів</div></div><Switch v-model="push" /></div>
                  <div class="toggle"><div><div class="t-lg">Автозбір</div><div class="t-sm muted">Збирати без кліків</div></div><Switch v-model="auto" /></div>
                </div>
              </Card>
              <div class="row end gap">
                <HelpButton size="64" />
                <OkButton size="64" @click="save" />
              </div>
            </template>

            <!-- ПРОФІЛЬ -->
            <template v-else>
              <CardPrimary width="100%" height="auto" :padding="16">
                <div class="row gap">
                  <div>
                    <div class="t-xl">PixelHero_UA</div>
                    <div class="t-sm muted">Рейнджер полуничного світу</div>
                    <div class="t-sm ok">92 400 / 100 000 досвіду</div>
                  </div>
                </div>
                <div class="bar tall"><i style="width: 92%"></i></div>
              </CardPrimary>
              <div class="stat-grid">
                <Card width="100%" height="auto" :padding="10"><div class="stat"><img src="/ui/money.png" class="px-img s32" alt="" /><span class="t-lg">{{ fmt(coins) }}</span><span class="t-sm muted">Монет</span></div></Card>
                <Card width="100%" height="auto" :padding="10"><div class="stat"><img src="/ui/strawberry.png" class="px-img s32" alt="" /><span class="t-lg">{{ fmt(berries) }}</span><span class="t-sm muted">Полуничок</span></div></Card>
                <Card width="100%" height="auto" :padding="10"><div class="stat"><Icon icon="pixelarticons:zap" class="stat-ic" /><span class="t-lg">{{ energy }}</span><span class="t-sm muted">Енергія</span></div></Card>
              </div>
              <Card width="100%" height="auto" :padding="12">
                <div class="t-lg" style="margin-bottom:8px">Інвентар</div>
                <div class="inv">
                  <AvatarBorder v-for="i in 8" :key="i" size="64" padding="6">
                    <img :src="i % 2 ? '/ui/money.png' : '/ui/strawberry.png'" class="px-img s32" alt="" />
                  </AvatarBorder>
                </div>
              </Card>
            </template>
          </main>

          <!-- Нижня панель -->
          <footer class="dock">
            <GameButton size="64" :active="screen === 'farm'" @click="screen = 'farm'" />
            <ShopButton size="64" :active="screen === 'shop'" @click="screen = 'shop'" />
            <TopButton size="64" :active="screen === 'top'" @click="screen = 'top'" />
            <SettingsButton size="64" :active="screen === 'settings'" @click="screen = 'settings'" />
          </footer>
        </div>
      </div>
    </section>

    <!-- ═════════ КОМПОНЕНТИ ═════════ -->
    <section v-else-if="tab === 'components'" class="comp-tab">
      <div class="comp-block">
        <h2>Іконкові кнопки · 64px</h2>
        <div class="demo-row dark">
          <GameButton size="64" /><ShopButton size="64" /><TopButton size="64" /><SettingsButton size="64" />
          <OkButton size="64" /><HelpButton size="64" /><CloseButton size="64" />
        </div>
      </div>

      <div class="comp-block">
        <h2>Текстова кнопка · ButtonText</h2>
        <div class="demo-split">
          <div class="controls">
            <label>Текст <input v-model="btnText" type="text" /></label>
            <label class="chk"><input v-model="btnAuto" type="checkbox" /> Ширина за текстом</label>
            <label v-if="!btnAuto">Ширина: {{ btnWidth }}px <input v-model.number="btnWidth" type="range" min="96" max="320" step="8" /></label>
            <label class="chk"><input v-model="btnActive" type="checkbox" /> Натиснута (active)</label>
            <label class="chk"><input v-model="btnDisabled" type="checkbox" /> Заблокована</label>
            <label class="chk"><input v-model="btnLoading" type="checkbox" /> Завантаження</label>
          </div>
          <div class="stage">
            <ButtonText
                :width="btnAuto ? 'auto' : btnWidth"
                :disabled="btnDisabled" :loading="btnLoading" :active="btnActive"
                @click="clicks++"
            >{{ btnText }}</ButtonText>
            <span class="t-sm gold">Кліків: {{ clicks }}</span>
          </div>
        </div>
      </div>

      <div class="comp-block">
        <h2>Картки</h2>
        <div class="demo-split">
          <div class="controls">
            <label>Ширина: {{ cardW }}px <input v-model.number="cardW" type="range" min="200" max="400" step="10" /></label>
            <label>Відступ: {{ cardPad }}px <input v-model.number="cardPad" type="range" min="0" max="32" step="4" /></label>
            <label>Розмір тексту: {{ cardFs }}px <input v-model.number="cardFs" type="range" min="12" max="32" step="2" /></label>
          </div>
          <div class="stage col" :style="{ '--fs': cardFs + 'px' }">
            <CardPrimary :width="cardW" height="auto" :padding="cardPad">
              <div class="fs-title ink">CardPrimary</div>
              <div class="fs-text muted">Акцентна картка для головних блоків</div>
            </CardPrimary>
            <Card :width="cardW" height="auto" :padding="cardPad">
              <div class="fs-title ink">Card</div>
              <div class="fs-text muted">Звичайна картка для списків</div>
            </Card>
          </div>
        </div>
      </div>

      <div class="comp-block">
        <h2>Повідомлення, перемикач, вікно</h2>
        <div class="demo-split">
          <div class="controls">
            <label class="chk"><input v-model="msgClosable" type="checkbox" /> Кнопка закриття</label>
          </div>
          <div class="stage col">
            <Message title="Нагорода" :closable="msgClosable" width="100%"><p style="margin:0">Щоденний бонус: +100 монет.</p></Message>
            <div class="row gap"><Switch v-model="sw" /><span class="t-md">{{ sw ? 'Увімкнено' : 'Вимкнено' }}</span></div>
            <ButtonText @click="demoModal = true">Відкрити вікно</ButtonText>
          </div>
        </div>
      </div>
    </section>

    <!-- ═════════ ШРИФТ ═════════ -->
    <section v-else class="type-tab">
      <CardPrimary width="100%" height="auto" :padding="20">
        <div class="type-wrap">
          <div class="t-xl">Crumbline · основний шрифт</div>
          <div class="scale">
            <div><span class="tag">12</span><span style="font-size:12px">Ваші бізнеси: Полунична ферма</span></div>
            <div><span class="tag">16</span><span style="font-size:16px">Ваші бізнеси: Полунична ферма</span></div>
            <div><span class="tag">20</span><span style="font-size:20px">Ваші бізнеси: Полунична ферма</span></div>
            <div><span class="tag">24</span><span style="font-size:24px">Ваші бізнеси: Полунична ферма</span></div>
            <div><span class="tag">32</span><span style="font-size:32px">Ваші бізнеси</span></div>
          </div>
          <p class="t-md" style="margin:0">АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ<br />абвгґдеєжзиіїйклмнопрстуфхцчшщьюя<br />0123456789 +−×÷ % ₴ ! ? . , :</p>
          <div class="row gap wrap">
            <ButtonText>Зібрати</ButtonText>
            <ButtonText>Купити за 100</ButtonText>
            <ButtonText>Налаштування</ButtonText>
          </div>
        </div>
      </CardPrimary>
    </section>
  </div>
</template>

<style scoped>
.showcase {
  --wood-0: #1a1008;
  --wood-1: #2b1f17;
  --wood-2: #5a4332;
  --wood-3: #8b6d51;
  --gold: #f7d070;
  --ink: #3f2e21;
  --paper: #d1c1b1;
  --leaf: #4f9d3a;
  --leaf-d: #2f6b2a;
  --soil: #7a5230;

  max-width: 980px;
  margin: 0 auto;
  padding: 20px 16px 64px;
  box-sizing: border-box;
  color: #eaefef;
  font-family: 'Crumbline', monospace;
  font-size: 16px;
  line-height: 1.25;
  -webkit-font-smoothing: none;
}
.showcase * { font-family: inherit; box-sizing: border-box; }

/* Типографічна шкала (кратна пікселю шрифту) */
.t-sm { font-size: 14px; }
.t-md { font-size: 16px; }
.t-lg { font-size: 20px; }
.t-xl { font-size: 24px; }
.muted { color: #8a6f58; }
.gold { color: var(--gold); }
.ok { color: #2e7d32; }
.ink { color: var(--ink); }
.px-img { image-rendering: pixelated; object-fit: contain; }
.s16 { width: 16px; height: 16px; }
.s32 { width: 32px; height: 32px; }
.row { display: flex; align-items: center; }
.row.between { justify-content: space-between; gap: 12px; }
.row.gap { gap: 12px; }
.row.end { justify-content: flex-end; }
.row.wrap { flex-wrap: wrap; }
.grow { flex: 1; min-width: 0; }

/* Шапка */
.page-head { text-align: center; margin-bottom: 20px; }
.page-head h1 { margin: 8px 0 14px; font-size: 32px; font-weight: normal; color: var(--gold); text-shadow: 2px 2px 0 var(--wood-0); }
.ghost-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px;
  background: rgba(63, 46, 33, .8); border: 2px solid var(--wood-3); color: #fff;
  font-size: 14px; cursor: pointer;
}
.ghost-btn:hover { background: var(--wood-3); }
.tabs, .screen-picker { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.tabs button, .screen-picker button {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px;
  background: rgba(30, 24, 20, .85); border: 2px solid var(--wood-2); color: var(--paper);
  font-size: 16px; cursor: pointer;
}
.tabs button:hover, .screen-picker button:hover { border-color: #a88365; color: #fff; }
.tabs button.on, .screen-picker button.on { background: var(--wood-3); border-color: var(--gold); color: #fff; }
.screen-picker { margin-bottom: 20px; }
.screen-picker button { font-size: 14px; padding: 6px 12px; }

/* Телефон */
.phone {
  width: 100%; max-width: 420px; margin: 0 auto; padding: 12px;
  background: #0d0805; border: 3px solid var(--wood-2); border-radius: 28px;
  box-shadow: 0 0 0 3px var(--wood-0), 0 18px 40px rgba(0, 0, 0, .5);
}
.phone-screen {
  display: flex; flex-direction: column; height: 760px; overflow: hidden; border-radius: 16px;
  background:
      repeating-linear-gradient(0deg, rgba(0,0,0,.05) 0 4px, transparent 4px 8px),
      linear-gradient(#6fb04a, #4f8f3a);
}
.hud {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  background: linear-gradient(var(--wood-1), #1f150e); border-bottom: 3px solid var(--wood-0);
}
.hud-name { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.hud-name .muted { color: var(--paper); }
.hud-res { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
.res { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; color: var(--gold); }
.phone-body { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 12px; color: var(--ink); }
.dock {
  display: flex; justify-content: space-around; align-items: center; padding: 8px;
  background: linear-gradient(#1f150e, var(--wood-0)); border-top: 3px solid var(--wood-2);
}

/* Ферма */
.field {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 8px;
  background: #5a3a20; border: 3px solid #3a2412;
}
.plot {
  aspect-ratio: 1; display: grid; place-items: center; cursor: pointer; padding: 0;
  background: var(--soil); border: 2px solid #4a3019;
  box-shadow: inset 0 -4px 0 rgba(0,0,0,.2);
}
.plot.st-2 { background: #8a5d35; }
.plot:active { transform: translateY(2px); }
.sprout { width: 14px; height: 14px; background: var(--leaf); box-shadow: 0 -6px 0 var(--leaf-d), -6px 0 0 var(--leaf-d), 6px 0 0 var(--leaf-d); }
.bar { height: 12px; margin: 10px 0 4px; background: var(--wood-1); border: 2px solid var(--ink); }
.bar.tall { height: 16px; margin-top: 12px; }
.bar i { display: block; height: 100%; background: #f2a516; }

/* Магазин */
.price { display: inline-flex; align-items: center; gap: 4px; color: #b45309; margin-top: 2px; }
.buy-modal { display: flex; gap: 12px; align-items: center; color: var(--ink); }

/* Рейтинг */
.podium { display: flex; justify-content: center; align-items: flex-end; gap: 14px; color: var(--ink); }
.pod { display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; }
.pod.p1 { margin-bottom: 14px; }
.step { width: 64px; display: grid; place-items: center; background: var(--wood-3); border: 2px solid var(--ink); color: #fff; font-size: 20px; margin-top: 4px; }
.step.h1 { height: 72px; background: #d97706; }
.step.h2 { height: 48px; }
.step.h3 { height: 32px; }
.fs-title { font-size: calc(var(--fs, 16px) + 4px); margin-bottom: 4px; }
.fs-text { font-size: var(--fs, 16px); }
.crown { font-size: 24px; color: #d97706; }
.rank-list { display: flex; flex-direction: column; gap: 6px; }
.rank-row { display: flex; align-items: center; gap: 10px; padding: 6px 8px; background: rgba(63,46,33,.07); color: var(--ink); }
.rank-row.me { background: rgba(217,119,6,.2); outline: 2px solid #d97706; }
.rank-n { width: 20px; text-align: center; font-size: 18px; }
.rank-row .res { color: #b45309; }

/* Налаштування */
.toggles { display: flex; flex-direction: column; color: var(--ink); }
.toggle { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 2px solid rgba(139,109,81,.25); }
.toggle:last-child { border-bottom: 0; }

/* Профіль */
.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.stat { display: flex; flex-direction: column; align-items: center; gap: 2px; color: var(--ink); }
.stat-ic { font-size: 32px; color: #d97706; }
.inv { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; justify-items: center; }
.phone-body :deep(.t-lg), .phone-body { color: var(--ink); }

/* Компоненти */
.comp-tab { display: flex; flex-direction: column; gap: 20px; }
.comp-block { background: rgba(26,16,8,.85); border: 2px solid var(--wood-2); padding: 16px; }
.comp-block h2 { margin: 0 0 14px; font-size: 20px; font-weight: normal; color: var(--gold); }
.demo-row { display: flex; flex-wrap: wrap; gap: 12px; padding: 12px; justify-content: center; }
.demo-row.dark { background: rgba(0,0,0,.4); border: 2px dashed var(--wood-2); }
.demo-split { display: grid; grid-template-columns: 1fr; gap: 16px; }
@media (min-width: 720px) { .demo-split { grid-template-columns: 260px 1fr; } }
.controls { display: flex; flex-direction: column; gap: 12px; font-size: 14px; color: var(--paper); }
.controls label { display: flex; flex-direction: column; gap: 4px; }
.controls label.chk { flex-direction: row; align-items: center; gap: 8px; cursor: pointer; }
.controls input[type='text'] { padding: 6px 8px; background: rgba(63,46,33,.8); border: 2px solid var(--wood-3); color: #fff; font-size: 16px; }
.stage {
  min-height: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
  padding: 20px; background: rgba(0,0,0,.4); border: 2px dashed var(--wood-2); overflow: auto;
}
.stage.col { align-items: stretch; }
.stage.col > * { align-self: center; }

/* Шрифт */
.type-wrap { display: flex; flex-direction: column; gap: 16px; color: var(--ink); }
.scale { display: flex; flex-direction: column; gap: 8px; }
.scale > div { display: flex; align-items: baseline; gap: 12px; }
.tag { width: 28px; font-size: 12px; color: #8a6f58; }
</style>