'use strict';

import mongoose from 'mongoose';

/**
 * LoyaltyMember — tracks guest loyalty points and tier status.
 * Points are earned per dollar spent. Tiers unlock perks.
 */
const loyaltyMemberSchema = new mongoose.Schema(
  {
    guest_email: { type: String, required: true, unique: true, index: true },
    guest_name: { type: String, default: '' },
    points: { type: Number, default: 0 },
    total_spent: { type: Number, default: 0 },
    tier: {
      type: String,
      enum: ['silver', 'gold', 'platinum'],
      default: 'silver',
    },
    // Guest preferences
    preferences: {
      room_type: { type: String, default: '' },
      pillow: { type: String, default: '' },
      allergies: { type: String, default: '' },
      anniversary: { type: String, default: '' }, // YYYY-MM-DD
      notes: { type: String, default: '' },
    },
    // Stats
    total_stays: { type: Number, default: 0 },
    last_stay: { type: Date, default: null },
    member_since: { type: Date, default: Date.now },
    // Referral
    referral_code: { type: String, default: '' },
    referred_by: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Tier thresholds
loyaltyMemberSchema.statics.TIER_THRESHOLDS = {
  gold: 2000,     // $2,000 spent
  platinum: 5000, // $5,000 spent
};

// Points per ₦1,000 spent
loyaltyMemberSchema.statics.POINTS_PER_NAIRA = 10;

export default mongoose.model('LoyaltyMember', loyaltyMemberSchema);
