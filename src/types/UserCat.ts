import type { CatColors } from '@/services/catRecolor'

export interface UserCat {
  id?: number
  name?: string | null
  colors: CatColors
  pettedCount: number
}
