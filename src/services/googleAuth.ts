import api from '@/services/api'

declare global {
  interface Window {
    google?: any
  }
}

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'

let isSdkLoaded = false

/**
 * Динамічне завантаження Google Identity Services SDK
 */
export function loadGoogleSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isSdkLoaded || window.google?.accounts?.id) {
      isSdkLoaded = true
      return resolve()
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      isSdkLoaded = true
      resolve()
    }
    script.onerror = (err) => reject(err)
    document.head.appendChild(script)
  })
}

/**
 * Ініціалізація Google Sign-In з колбеком для отримання Credential (ID Token)
 */
export async function initGoogleAuth(onCredentialReceived: (idToken: string) => void): Promise<void> {
  await loadGoogleSdk()
  if (window.google?.accounts?.id) {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response: any) => {
        if (response && response.credential) {
          onCredentialReceived(response.credential)
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true
    })
  }
}

/**
 * Показ вікна входу / підказки Google One Tap
 */
export async function promptGoogleAuth(onCredentialReceived: (idToken: string) => void): Promise<void> {
  await initGoogleAuth(onCredentialReceived)
  if (window.google?.accounts?.id) {
    window.google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Якщо One Tap недоступний або закритий, показуємо стандартну кнопку/діалог
      }
    })
  }
}

/**
 * Відмальовка стандартної кнопки Google Sign-In в елементі
 */
export async function renderGoogleButton(element: HTMLElement, onCredentialReceived: (idToken: string) => void): Promise<void> {
  await initGoogleAuth(onCredentialReceived)
  if (window.google?.accounts?.id && element) {
    window.google.accounts.id.renderButton(element, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left'
    })
  }
}

/**
 * Вхід через Google (надсилання idToken на бекенд)
 */
export async function loginWithGoogle(idToken: string) {
  const response = await api.post('/auth/google', { token: idToken })
  return response.data
}

/**
 * Прив'язка Google акаунта до існуючого користувача
 */
export async function linkGoogleAccount(idToken: string) {
  const response = await api.post('/users/link-google', { token: idToken })
  return response.data
}

/**
 * Відв'язка Google акаунта від профілю
 */
export async function unlinkGoogleAccount() {
  const response = await api.post('/users/unlink-google')
  return response.data
}
