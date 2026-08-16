'use strict';

import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    ref: { type: String, required: true, unique: true, index: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    guest_name: { type: String, required: true },
    guest_email: { type: String, required: true },
    guest_phone: { type: String, default: '' },
    check_in: { type: String, required: true }, // YYYY-MM-DD (UTC)
    check_out: { type: String, required: true }, // YYYY-MM-DD (UTC)
    guests: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['confirmed', 'checked_in', 'checked_out', 'cancelled'],
      default: 'confirmed',
      index: true,
    },
    payment_status: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
      index: true,
    },
    stripe_session_id: { type: String, default: null, index: true },
    paid_at: { type: Date, default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

bookingSchema.index({ check_in: 1, status: 1 });
bookingSchema.index({ check_out: 1, status: 1 });

export default mongoose.model('Booking', bookingSchema);
