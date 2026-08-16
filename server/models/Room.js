'use strict';

import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    // Sparse unique: every new room carries a number, but collections seeded
    // before room numbers existed keep working until backfill assigns them.
    room_number: { type: String, required: true, unique: true, sparse: true },
    floor: { type: Number, default: 0 },
    type: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    capacity: { type: Number, required: true },
    size_sqm: { type: Number, required: true },
    amenities: { type: [String], default: [] },
    art: { type: String, required: true },
    // Admin-chosen photography: 0–2 local /images/… paths. When set they
    // override the shared per-name pool (see shared/roomPhotos.js).
    photos: { type: [String], default: [] },
    status: { type: String, enum: ['active', 'maintenance'], default: 'active' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Room', roomSchema);
