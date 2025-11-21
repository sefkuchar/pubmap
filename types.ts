// New dataset format from test_dataset.js (primary format)
export interface NewPubEntry {
  title: string;
  totalScore: number;
  reviewsCount: number;
  street: string;
  city: string;
  state: string | null;
  countryCode: string;
  website: string | null;
  phone: string | null;
  categoryName: string;
  url: string;
  priceRating: number;
}

// Extended PubEntry that includes original data
export interface PubEntry extends NewPubEntry {
  name: string; // alias for title
  priceKc: number | null; // mapped from priceRating
  lat?: number;
  lng?: number;
  address?: string; // combined street + city
  beersRaw: string; // mapped from categoryName
}

export interface ProcessedPub extends PubEntry {
  beers: string[];
  beerCount: number;
}

export type SortKey = 'name' | 'priceKc' | 'beerCount' | 'totalScore' | 'reviewsCount' | 'priceRating' | 'street' | 'city' | 'categoryName' | 'phone' | 'website';

