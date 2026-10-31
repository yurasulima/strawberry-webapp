<script setup lang="ts">
import { useRouter } from 'vue-router'
import { CardPrimary, Card, ButtonText, SlideFade } from '@/components/pixel'

const router = useRouter()

function goHome() {
  router.push('/')
}

function goDeleteAccount() {
  router.push('/delete-account')
}
</script>

<template>
  <div class="privacy-container">
    <SlideFade>
      <CardPrimary width="100%" height="auto" :padding="16">
        <div class="privacy-header">
          <img src="/items/strawberry.png" alt="Strawberry Logo" class="privacy-logo" />
          <h1 class="title">Політика Конфіденційності</h1>
          <p class="subtitle">Strawberry Game • Останнє оновлення: 31 жовтня 2026 р.</p>
        </div>

        <Card width="100%" height="auto" :padding="14" class="privacy-card">
          <div class="content">
            <section class="section">
              <h2>1. Загальні положення</h2>
              <p>
                Ця Політика конфіденційності пояснює, як гра <strong>Strawberry Game</strong> («ми», «наш додаток») збирає, використовує та захищає інформацію користувачів при використанні веб-версії та Android-додатка.
              </p>
            </section>

            <section class="section">
              <h2>2. Інформація, яку ми збираємо</h2>
              <ul>
                <li><strong>Ідентифікаційні дані:</strong> Ваш Telegram ID, ім'я, прізвище, нікнейм (username) та мова інтерфейсу для автентифікації.</li>
                <li><strong>Ігрові дані:</strong> Прогрес у грі, кількість монет та полуниць, ігровий рівень, предмети в інвентарі, щоденні нагороди.</li>
                <li><strong>Технічні дані:</strong> Базова інформація про пристрій (версія додатка, мовні налаштування) для стабільної роботи гри.</li>
              </ul>
            </section>

            <section class="section">
              <h2>3. Мета збору даних</h2>
              <p>Ми використовуємо зібрану інформацію виключно для:</p>
              <ul>
                <li>Створення та підтримання облікового запису користувача.</li>
                <li>Збереження та синхронізації ігрового прогресу.</li>
                <li>Формування таблиці лідерів та рейтингу гравців.</li>
                <li>Забезпечення технічної підтримки користувачів.</li>
              </ul>
            </section>

            <section class="section">
              <h2>4. Захист та передача даних</h2>
              <p>
                Усі персональні та ігрові дані передаються через захищені протоколи шифрування (HTTPS/TLS).
                Ми <strong>не передаємо, не продаємо і не розголошуємо</strong> персональні дані користувачів третім особам або рекламним платформам.
              </p>
            </section>

            <section class="section">
              <h2>5. Видалення даних та права користувачів</h2>
              <p>
                Ви маєте повне право у будь-який момент вимагати видалення вашого облікового запису та всіх пов'язаних ігрових даних.
              </p>
              <div class="action-box">
                <ButtonText height="44" width="100%" padding="8px 16px" @click="goDeleteAccount">
                  🗑 Перейти до видалення акаунту
                </ButtonText>
              </div>
            </section>

            <section class="section">
              <h2>6. Контакти для зв'язку</h2>
              <p>Якщо у вас виникли запитання щодо цієї Політики конфіденційності або роботи гри, ви можете звернутися до нас:</p>
              <ul>
                <li>Telegram Bot / Підтримка: <strong>@StrawberryAppBot</strong></li>
                <li>Електронна пошта: <strong>support@memories-app.org</strong></li>
              </ul>
            </section>

            <div class="footer-actions">
              <ButtonText height="48" width="100%" padding="8px 16px" @click="goHome">
                🏠 На головну
              </ButtonText>
            </div>
          </div>
        </Card>
      </CardPrimary>
    </SlideFade>
  </div>
</template>

<style scoped>
.privacy-container {
  max-width: 680px;
  margin: 0 auto;
  padding: 20px 14px;
  box-sizing: border-box;
  font-family: 'Crumbline', sans-serif;
  color: #3f2e21;
}

.privacy-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 14px;
}

.privacy-logo {
  width: 56px;
  height: 56px;
  object-fit: contain;
  image-rendering: pixelated;
  margin-bottom: 6px;
}

.title {
  margin: 0;
  font-size: 24px;
  color: #3f2e21;
}

.subtitle {
  margin: 4px 0 0;
  font-size: 14px;
  color: #6d4c41;
}

.privacy-card {
  box-sizing: border-box;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-size: 16px;
  line-height: 1.4;
}

.section h2 {
  font-size: 18px;
  margin: 0 0 6px;
  color: #3f2e21;
}

.section p {
  margin: 0 0 8px;
  color: #5d4037;
}

.section ul {
  margin: 0;
  padding-left: 20px;
  color: #5d4037;
}

.section li {
  margin-bottom: 4px;
}

.action-box {
  margin-top: 8px;
}

.footer-actions {
  margin-top: 10px;
}
</style>
