'use strict';

import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    capacity: { type: Number, required: true },
    size_sqm: { type: Number, required: true },
    amenities: { type: [String], default: [] },
    art: { type: String, required: true },
    status: { type: String, enum: ['active', 'maintenance'], default: 'active' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Room', roomSchema);
