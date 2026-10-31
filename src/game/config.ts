/** Розмір одного тайла у світових пікселях. */
export const TILE = 32

/** Висота "об'єму" стіни/дерева (піксели), що виступає вгору від основи. Це і дає ефект 2.5D. */
export const WALL_HEIGHT = 16
export const TREE_HEIGHT = 24

/** Фіксований крок логіки (секунди). Рендер іде незалежно від нього. */
export const FIXED_STEP = 1 / 60
/** Захист від "спіралі смерті": максимум кроків логіки за один кадр. */
export const MAX_STEPS_PER_FRAME = 5

/** Скільки тайлів по висоті має бути видно на екрані (для вибору цілочисельного зуму). */
export const VIEW_TILES_HEIGHT = 12

export const PLAYER = {
  speed: 110, // px/s
  halfWidth: 8,
  footHeight: 10, // висота хітбокса вгору від ніг
} as const

export const CAMERA = {
  /** Чим більше, тим швидше камера наздоганяє гравця (1/с). */
  followSharpness: 8,
} as const

export const COLORS = {
  background: 0x14161f,
} as const
