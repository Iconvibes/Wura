'use strict';

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    // 'admin' — everything (rooms, rates, settings, credentials, users).
    // 'staff' — front desk + inbox + their own password.
    role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
