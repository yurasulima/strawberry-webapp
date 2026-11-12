

export interface Business {
    id: number;
    name: string;
    nameUk?: string | null;
    nameEn?: string | null;
    nameRu?: string | null;
    yieldCount: number;
    yieldInterval: string;
    item: string;
    price?: number;
    minLevel?: number;
    premiumOnly?: boolean;
}