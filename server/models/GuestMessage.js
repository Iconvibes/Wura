'use strict';

import mongoose from 'mongoose';

/**
 * GuestMessage — two-way threaded messaging between guests and staff.
 * Each thread is tied to a booking. Guests message via a link; staff reply
 * from the admin panel.
 */
const guestMessageSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    // Thread messages
    messages: [{
      sender: { type: String, enum: ['guest', 'staff'], required: true },
      sender_name: { type: String, default: '' },
      text: { type: String, required: true },
      read: { type: Boolean, default: false },
      created_at: { type: Date, default: Date.now },
    }],
    // Quick reference fields (denormalized from booking for fast listing)
    guest_name: { type: String, default: '' },
    guest_email: { type: String, default: '' },
    room_name: { type: String, default: '' },
    room_number: { type: String, default: '' },
    check_in: { type: String, default: '' },
    check_out: { type: String, default: '' },
    status: {
      type: String,
      enum: ['open', 'resolved', 'archived'],
      default: 'open',
      index: true,
    },
    unread_staff: { type: Number, default: 0 },
    unread_guest: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('GuestMessage', guestMessageSchema);
