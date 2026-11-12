export interface DurationUnit {
    dateBased: boolean;
    timeBased: boolean;
    durationEstimated: boolean;
}

export interface YieldInterval {
    seconds: number;
    nano: number;
    negative: boolean;
    zero: boolean;
    units: DurationUnit[];
}

export interface Item {
    id: number;
    name: string;
}

export interface UBusiness {
    id: number;
    name: string;
    nameUk?: string | null;
    nameEn?: string | null;
    nameRu?: string | null;
    yieldCount: number;
    yieldInterval: YieldInterval;
    item: Item;
}

export interface UserBusiness {
    id: number;
    business: UBusiness;
    usedAt: string; // ISO дата у форматі рядка
    count: number;
    nextCollectAt?: string;
    nextCollectInSeconds?: number;
    canCollect?: boolean;
    accumulatedYield?: number;
    maxAccumulatedYield?: number;
}
