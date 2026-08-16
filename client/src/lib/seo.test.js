import { describe, it, expect } from 'vitest';
import { hotelLD, roomOfferLD } from './seo.js';

describe('hotelLD', () => {
  it('builds a Hotel block with the aggregate rating', () => {
    const ld = hotelLD();
    expect(ld['@type']).toBe('Hotel');
    expect(ld.name).toBe('Wura Grand Hotel');
    expect(ld.aggregateRating).toMatchObject({
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '2400',
      bestRating: '5',
    });
    expect(ld.starRating.ratingValue).toBe('5');
    expect(ld.checkinTime).toBe('15:00');
    expect(ld.checkoutTime).toBe('11:00');
    expect(ld.address).toMatchObject({ '@type': 'PostalAddress' });
    expect(ld.amenityFeature.length).toBeGreaterThan(3);
  });
});

describe('roomOfferLD', () => {
  const room = {
    name: 'Deluxe King',
    type: 'Deluxe',
    price: 179,
    capacity: 2,
    description: 'A generous king room.',
  };

  it('builds a HotelRoom block with a priced Offer', () => {
    const ld = roomOfferLD(room);
    expect(ld['@type']).toBe('HotelRoom');
    expect(ld.name).toBe('Deluxe King');
    expect(ld.occupancy.maxValue).toBe(2);
    expect(ld.offers).toMatchObject({
      '@type': 'Offer',
      price: '179',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    });
    expect(ld.offers.url).toContain('Deluxe%20King');
    expect(ld.image.length).toBeGreaterThan(0);
  });
});
