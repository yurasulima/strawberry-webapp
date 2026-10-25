

export interface Business {
    id: number;
    name: string;
    yieldCount: number;
    yieldInterval: string;
    item: string;
    price?: number;
    minLevel?: number;
    premiumOnly?: boolean;
}