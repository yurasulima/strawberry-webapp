import type {Slot} from "@/types/Slot.ts";
import type {InvitedUser} from "@/types/InvitedUser.ts";
import type {UserBusiness} from "@/types/UserBusiness.ts";

export interface User {
  photoUrl?: string | null
  createAt: string
  lastOnlineAt?: string | null
  userId: number
  telegramId: number
  firstName: string | null
  lastName: string | null
  bio: string | null
  lang: string | null
  premium: boolean
  banned: boolean
  dailyStrawberryClicks?: number
  remainingDailyClicks?: number
  slots: Slot[]
  businesses: UserBusiness[]
  invites: InvitedUser[]
}
