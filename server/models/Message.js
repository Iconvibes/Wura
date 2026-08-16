'use strict';

import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, default: '' },
    message: { type: String, required: true },
    read: { type: Boolean, default: false, index: true },
    // When the guest submitted the form (the log's timestamp). Distinct from
    // created_at so migrated log entries keep their original time.
    sent_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

messageSchema.index({ created_at: -1 });

export default mongoose.model('Message', messageSchema);
