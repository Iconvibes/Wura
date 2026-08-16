// JSON-LD structured data builders (schema.org) for rich search results.
// URLs derive from window.location.origin so they're correct on any domain.
import { roomPhotos } from './photos.jsx';

const ORIGIN = () => (typeof window !== 'undefined' ? window.location.origin : '');

/** The global Hotel block + AggregateRating — injected on every page. */
export function hotelLD() {
  const origin = ORIGIN();
  return {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: 'Wura Grand Hotel',
    alternateName: 'Wura Grand',
    description:
      'Five-star rooms and suites with skyline views, a rooftop pool, golden spa and wood-fired dining. Family-run since 1962.',
    url: `${origin}/`,
    logo: `${origin}/favicon.svg`,
    image: [
      `${origin}/images/hero.jpg`,
      `${origin}/images/pool.jpg`,
      `${origin}/images/rooms/suite.jpg`,
    ],
    telephone: '+1-555-012-1962',
    email: 'stay@wuragrand.example',
    priceRange: '$$$',
    foundingDate: '1962',
    checkinTime: '15:00',
    checkoutTime: '11:00',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '1 Golden Crescent',
      addressLocality: 'City Centre',
      addressRegion: 'Lagos',
      postalCode: '100001',
      addressCountry: 'NG',
    },
    starRating: {
      '@type': 'Rating',
      ratingValue: '5',
    },
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: 'Rooftop pool', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Spa & hammam', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Restaurant', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Free Wi-Fi', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Chauffeur service', value: true },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '2400',
      bestRating: '5',
    },
  };
}

/**
 * Per-room HotelRoom + Offer block — injected on each room detail page.
 * Room offers use the Multi-Typed Entity form ([HotelRoom, Product]) per
 * schema.org/docs/hotels.html — a bare HotelRoom is a Place, not a Product,
 * so `offers` on it alone trips a schema.org validator warning.
 */
export function roomOfferLD(room) {
  const origin = ORIGIN();
  const url = `${origin}/rooms/${encodeURIComponent(room.name)}`;
  return {
    '@context': 'https://schema.org',
    '@type': ['HotelRoom', 'Product'],
    name: room.name,
    description: room.description,
    url,
    image: roomPhotos(room).map((src) => `${origin}${src}`),
    bed: {
      '@type': 'BedDetails',
      numberOfBeds: room.capacity >= 3 ? 2 : 1,
    },
    occupancy: {
      '@type': 'QuantitativeValue',
      maxValue: room.capacity,
    },
    offers: {
      '@type': 'Offer',
      name: `${room.name} — nightly rate`,
      price: String(Math.round(room.price)),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url,
      priceValidUntil: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      businessFunction: 'https://schema.org/LeaseOut',
    },
  };
}
