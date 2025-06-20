import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import uk from '@/locales/uk.json'
import ru from '@/locales/ru.json'
const savedLang = localStorage.getItem('lang') || 'en'
const i18n = createI18n({
    locale: savedLang,
    fallbackLocale: 'en',
    messages: {
        en,
        uk,
        ru,
    }
})

export default i18n
