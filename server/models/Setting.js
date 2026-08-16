'use strict';

import mongoose from 'mongoose';

// Runtime-configurable server settings (e.g. the staff access code). A single
// document per key; value is opaque (the access code is stored as-is — it is a
// short staff gate, not a password, and the API rate-limits attempts).
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Setting', settingSchema);
