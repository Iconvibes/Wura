'use strict';

import mongoose from 'mongoose';

/**
 * PricingRule — flexible pricing rules for the dynamic pricing engine.
 *
 * Supported types:
 *   - weekend:      Surcharge on Fri/Sat/Sun (or specific days of week)
 *   - seasonal:     Date range multiplier
 *   - occupancy:    Price adjustment based on property occupancy %
 *   - early_bird:   Discount for booking N+ days in advance
 *   - last_minute:  Discount for same-day/next-day check-in
 *   - minimum_stay: Minimum nights for a date range
 *   - event:        Custom markup for a specific date range (holidays, festivals)
 *
 * Each rule has a priority (higher = applied first) and an enabled toggle.
 * The pricing engine evaluates all enabled rules for a given room+dates combo
 * and returns the final adjusted price.
 */
const pricingRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['weekend', 'seasonal', 'occupancy', 'early_bird', 'last_minute', 'minimum_stay', 'event'],
    },
    enabled: { type: Boolean, default: true },
    priority: { type: Number, default: 0 }, // higher = applied first

    // Which room types this rule applies to. Empty = all types.
    room_types: { type: [String], default: [] },

    // Weekend rule
    days_of_week: { type: [Number], default: [] }, // 0=Sun, 1=Mon, ..., 6=Sat
    weekend_surcharge_pct: { type: Number, default: 0 }, // percentage markup (15 = +15%)

    // Seasonal / event rule
    start_date: { type: String, default: '' }, // YYYY-MM-DD
    end_date: { type: String, default: '' },   // YYYY-MM-DD
    seasonal_multiplier: { type: Number, default: 1 }, // 1.2 = +20%, 0.8 = -20%

    // Occupancy rule — triggers when occupancy % exceeds threshold
    occupancy_threshold_pct: { type: Number, default: 80 },
    occupancy_adjustment_pct: { type: Number, default: 20 }, // +20% above threshold

    // Early bird rule
    advance_days_min: { type: Number, default: 30 }, // book 30+ days out
    early_bird_discount_pct: { type: Number, default: 10 }, // 10% off

    // Last minute rule
    last_minute_days_max: { type: Number, default: 1 }, // same-day or next-day
    last_minute_discount_pct: { type: Number, default: 15 }, // 15% off

    // Minimum stay rule
    min_nights: { type: Number, default: 2 },

    // Description for the admin
    description: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('PricingRule', pricingRuleSchema);
