export const UI_TEXTURES = [
  '/ui/card.9.png',
  '/ui/primary_card.9.png',
  '/ui/border.9.png',
  '/ui/message.9.png',
  '/ui/selected.9.png',
  '/ui/button_text.9.png',
  '/ui/button_text_pressed.9.png',
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
  '/ui/button_left.png',
  '/ui/button_left_pressed.png',
  '/ui/button_right.png',
  '/ui/button_right_pressed.png',
  '/ui/button_help.png',
  '/ui/button_help_pressed.png',
  '/ui/button_business.png',
  '/ui/button_business_pressed.png',
  '/ui/button_admin.png',
  '/ui/button_admin_pressed.png',
  '/ui/button_inventory.png',
  '/ui/button_inventory_pressed.png',
  '/ui/button_gift.png',
  '/ui/button_gift_pressed.png',
  '/ui/button_add.png',
  '/ui/button_add_pressed.png',
  '/ui/button_edit.png',
  '/ui/button_edit_pressed.png',
  '/ui/button_delete.png',
  '/ui/button_delete_pressed.png',
  '/items/money.png',
  '/items/strawberry.png',
  '/items/blueberry.png',
  '/items/strawberry_juice.png',
  '/items/cherries.png',
  '/items/jam_cherry.png',
  '/items/blueberry_jam.png',
  '/items/blueberry_pie.png',
  '/items/strawberry_pie.png',
  '/ui/loading.png',
  '/ui/lock.png',
  '/ui/finger.png',
  '/ui/button_sound_enabled.png',
  '/ui/button_sound_disabled.png',
  '/ui/button_music_enabled.png',
  '/ui/button_music_disabled.png',
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
