import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import ua from '@/locales/ua.json'
import ru from '@/locales/ru.json'
const savedLang = localStorage.getItem('lang') || 'ua'
const i18n = createI18n({
    locale: savedLang,
    fallbackLocale: 'en',
    messages: {
        en,
        ua,
        ru,
    }
})

export default i18n
