export const UI_TEXTURES = [
  '/ui/card.9.png',
  '/ui/primary_card.9.png',
  '/ui/border.9.png',
  '/ui/message.9.png',
  '/ui/selected.9.png',
  '/ui/button_text.9.png',
  '/ui/button_text_pressed.9.png',
  '/honeywood/ui/btn_normal.png',
  '/honeywood/ui/btn_pressed.png',
  '/honeywood/ui/btn_hover.png',
  '/honeywood/ui/btn_disabled.png',
  '/ui/switch_on.png',
  '/ui/switch_off.png',
  '/ui/button_shop.png',
  '/ui/button_shop_pressed.png',
  '/ui/button_game.png',
  '/ui/button_game_pressed.png',
  '/ui/button_settings.png',
  '/ui/button_settings_pressed.png',
  '/ui/button_top.png',
  '/ui/button_top_pressed.png',
  '/ui/button_close.png',
  '/ui/button_close_pressed.png',
  '/ui/button_ok.png',
  '/ui/button_ok_pressed.png',
  '/ui/button_help.png',
  '/ui/button_help_pressed.png',
  '/ui/button_business.png',
  '/ui/button_business_pressed.png',
  '/ui/money.png',
  '/ui/strawberry.png',
]

const cache = new Map<string, HTMLImageElement>()

export function preloadTexture(url: string): Promise<HTMLImageElement> {
  if (typeof window === 'undefined') return Promise.resolve(new Image())
  if (cache.has(url)) {
    return Promise.resolve(cache.get(url)!)
  }
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      cache.set(url, img)
      resolve(img)
    }
    img.onerror = () => {
      resolve(img)
    }
    img.src = url
  })
}

export function preloadPixelTextures(urls: string[] = UI_TEXTURES): Promise<HTMLImageElement[]> {
  if (typeof window === 'undefined') return Promise.resolve([])
  return Promise.all(urls.map(preloadTexture))
}

// Auto preload in browser
if (typeof window !== 'undefined') {
  preloadPixelTextures()
}
