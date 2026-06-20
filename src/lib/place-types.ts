export interface PlaceLink {
  type: string;
  label: string;
  url: string;
  source: string;
  confidence: number;
  retrievedAt: string | null;
}

export interface PlaceDetails {
  openingHours: string[];
  bestTimeToVisit: string;
  reservationGuidance: string;
  dietaryTags: string[];
  accessibilityNotes: string;
  paymentNotes: string;
  photoUrls: string[];
  menuHighlights: string;
  visitTips: string;
  bookingNotes: string;
  socialLinks: Record<string, string>;
  updatedAt: string | null;
}

export interface PlaceSource {
  fieldName: string;
  sourceUrl: string;
  sourceTitle: string;
  excerpt: string;
  confidence: number;
  retrievedAt: string;
}

export interface Place {
  id: string;
  slug: string;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  price: string;
  distance: number;
  vibe: number;
  confidence: number;
  address: string;
  phone: string;
  website: string;
  googleMaps: string;
  booking: string;
  notes: string;
  description: string;
  lat?: number;
  lng?: number;
  isHomeBase?: boolean;
  status: string;
  links: PlaceLink[];
  details: PlaceDetails;
  sources: PlaceSource[];
  dataQuality: Record<string, unknown>;
  lastEnrichedAt: string | null;
  updatedAt: string;
}
