'use strict';

import mongoose from 'mongoose';

/**
 * HousekeepingTask — tracks room cleaning status, assignments, and priority.
 * Each task is tied to a room and a date. Staff see a visual dashboard.
 */
const housekeepingSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    status: {
      type: String,
      enum: ['dirty', 'in_progress', 'clean', 'inspected'],
      default: 'dirty',
      index: true,
    },
    priority: {
      type: String,
      enum: ['normal', 'high', 'urgent'],
      default: 'normal',
    },
    assigned_to: { type: String, default: '' },
    notes: { type: String, default: '' },
    estimated_minutes: { type: Number, default: 30 },
    started_at: { type: Date, default: null },
    completed_at: { type: Date, default: null },
    // Denormalized for fast dashboard display
    room_name: { type: String, default: '' },
    room_number: { type: String, default: '' },
    room_type: { type: String, default: '' },
    floor: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Compound index: one task per room per day
housekeepingSchema.index({ room: 1, date: 1 }, { unique: true });

export default mongoose.model('Housekeeping', housekeepingSchema);
