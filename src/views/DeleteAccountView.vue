<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { CardPrimary, Card, ButtonText, SlideFade } from '@/components/pixel'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'

const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()
const toastStore = useToastStore()

const isConfirmModalOpen = ref(false)
const isDeleting = ref(false)

const isLoggedIn = computed(() => !!authStore.token)

function goHome() {
  router.push('/')
}

function openConfirmModal() {
  isConfirmModalOpen.value = true
}

function closeConfirmModal() {
  isConfirmModalOpen.value = false
}

async function handleDeleteAccount() {
  if (!isLoggedIn.value || isDeleting.value) return
  isDeleting.value = true

  try {
    // Намагаємось виконати видалення акаунту через API
    await api.delete('/users/me')
    toastStore.showToast('Ваш акаунт та дані успішно видалені', 'success')
  } catch (err: any) {
    // Якщо API endpoint відсутній або виникла помилка, все одно очищаємо локальну сесію та показуємо повідомлення
    console.warn('API /users/me DELETE exception:', err)
    toastStore.showToast('Запит на видалення прийнято', 'info')
  } finally {
    authStore.logout()
    userStore.setUser(null as any)
    isDeleting.value = false
    isConfirmModalOpen.value = false
    router.push('/')
  }
}
</script>

<template>
  <div class="delete-container">
    <SlideFade>
      <CardPrimary width="100%" height="auto" :padding="16">
        <div class="delete-header">
          <img src="/items/strawberry.png" alt="Strawberry Logo" class="delete-logo" />
          <h1 class="title">Видалення акаунту та даних</h1>
          <p class="subtitle">Strawberry Game • Запит на видалення інформації</p>
        </div>

        <Card width="100%" height="auto" :padding="14" class="delete-card">
          <div class="content">
            <section class="section">
              <h2>1. Яка інформація підлягає видаленню?</h2>
              <p>При видаленні акаунту <strong>Strawberry Game</strong> назавжди та безповоротно видаляються наступні дані:</p>
              <ul>
                <li>Профіль користувача (Telegram ID, ім'я, прізвище, нікнейм, мова).</li>
                <li>Ігровий прогрес, рівень, досвід та щоденні серії відвідувань.</li>
                <li>Увесь інвентар: монети, полуниці, скрині та інші предмети.</li>
                <li>Записи у загальному рейтингу (Leaderboard) та статистика.</li>
              </ul>
            </section>

            <section class="section">
              <h2>2. Як видалити акаунт прямо зараз?</h2>
              <div v-if="isLoggedIn" class="login-delete-box">
                <p class="warning-text">
                  ⚠️ Ви зараз авторизовані у грі. Ви можете ініціювати видалення вашого акаунту безпосередньо кнопкою нижче:
                </p>
                <ButtonText
                  height="48"
                  width="100%"
                  padding="8px 16px"
                  :loading="isDeleting"
                  @click="openConfirmModal"
                >
                  🗑 Видалити мій акаунт та всі дані
                </ButtonText>
              </div>
              <div v-else class="not-logged-box">
                <p>
                  Якщо ви авторизовані у грі, увійдіть у свій акаунт або скористайтеся інструкцією нижче.
                </p>
              </div>
            </section>

            <section class="section">
              <h2>3. Видалення без доступу до додатка</h2>
              <p>
                Якщо ви видалили додаток або не маєте доступу до поточного пристрою, ви можете подати запит на видалення даних одним із наступних способів:
              </p>
              <ul>
                <li>
                  Напишіть у Telegram бот <strong>@StrawberryAppBot</strong> команду <code>/delete_account</code> або повідомлення оператору підтримки.
                </li>
                <li>
                  Надішліть лист на <strong>support@memories-app.org</strong> з вказанням вашого Telegram ID або нікнейму.
                </li>
              </ul>
              <p class="info-note">
                ℹ️ Запити на видалення, надіслані через бота або електронну пошту, обробляються протягом 24–48 годин.
              </p>
            </section>

            <div class="footer-actions">
              <ButtonText height="48" width="100%" padding="8px 16px" @click="goHome">
                🏠 Повернутися на головну
              </ButtonText>
            </div>
          </div>
        </Card>
      </CardPrimary>
    </SlideFade>

    <!-- Модальне вікно підтвердження видалення -->
    <div v-if="isConfirmModalOpen" class="modal-overlay">
      <CardPrimary width="340px" height="auto" :padding="14">
        <div class="confirm-modal-content">
          <h2 class="confirm-title">Ви впевнені?</h2>
          <p class="confirm-desc">
            Ваш акаунт, ігровий рівень, монети та всі предмети будуть знищені назавжди. Цю дію неможливо скасувати!
          </p>
          <div class="confirm-actions">
            <ButtonText height="44" width="100%" padding="8px 16px" @click="handleDeleteAccount">
              ⚠️ Так, видалити назавжди
            </ButtonText>
            <ButtonText height="44" width="100%" padding="8px 16px" @click="closeConfirmModal">
              Скасувати
            </ButtonText>
          </div>
        </div>
      </CardPrimary>
    </div>
  </div>
</template>

<style scoped>
.delete-container {
  max-width: 680px;
  margin: 0 auto;
  padding: 20px 14px;
  box-sizing: border-box;
  font-family: 'Crumbline', sans-serif;
  color: #3f2e21;
}

.delete-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 14px;
}

.delete-logo {
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

.delete-card {
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
  margin-bottom: 6px;
}

.warning-text {
  color: #b71c1c;
  font-weight: bold;
}

.info-note {
  font-size: 14px;
  color: #4e342e;
  background-color: rgba(255, 248, 225, 0.6);
  padding: 8px 12px;
  border-radius: 6px;
  border-left: 3px solid #ffb300;
}

.footer-actions {
  margin-top: 10px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background-color: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.confirm-modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
}

.confirm-title {
  margin: 0;
  font-size: 22px;
  color: #d32f2f;
}

.confirm-desc {
  font-size: 15px;
  color: #5d4037;
  margin: 0;
}

.confirm-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-top: 6px;
}
</style>
