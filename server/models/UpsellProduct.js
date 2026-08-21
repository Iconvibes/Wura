'use strict';

import mongoose from 'mongoose';

/**
 * UpsellProduct — add-on services guests can purchase during booking.
 * Examples: breakfast, airport pickup, late checkout, spa credits.
 * Displayed in the booking modal at Step 3 (guest details).
 */
const upsellProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },       // "Daily Breakfast"
    description: { type: String, default: '' },    // "Continental or full English"
    price: { type: Number, required: true },       // per unit (per day, per person, etc.)
    price_unit: { type: String, default: 'per night' }, // "per night", "per person", "flat fee"
    category: { type: String, default: 'general' }, // "dining", "transport", "comfort", "experience"
    icon: { type: String, default: 'plate' },      // icon name for the UI
    enabled: { type: Boolean, default: true },
    sort_order: { type: Number, default: 0 },
    // If true, the price multiplies by number of nights
    multiply_by_nights: { type: Boolean, default: false },
    // If true, the price multiplies by number of guests
    multiply_by_guests: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('UpsellProduct', upsellProductSchema);
