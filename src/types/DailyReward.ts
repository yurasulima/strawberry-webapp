export interface DailyRewardDay {
  day: number
  week: number
  icon: string
  rewardKey: string
  title: string
  strawberries: number
  coins: number
  milestone: boolean
  claimed: boolean
  current: boolean
  locked: boolean
}

export interface DailyRewardStatus {
  streak: number
  canClaim: boolean
  days: DailyRewardDay[]
}
