'use strict';

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

const MONGODB_URI = process.env.MONGODB_URI?.trim();

/**
 * connectDB — connects Mongoose to MongoDB.
 *
 * - If MONGODB_URI is set (Atlas / local mongod / Docker), use it.
 * - Otherwise spin up an in-memory MongoDB via mongodb-memory-server so the
 *   app runs out of the box with zero system installs. Data is ephemeral —
 *   the seed script repopulates on every boot in that mode.
 */
export async function connectDB() {
  let mem = null;
  let uri = MONGODB_URI;

  if (uri && uri.startsWith('<')) {
    throw new Error('MONGODB_URI appears to be a placeholder value. Set a real MongoDB connection string in Render or your .env file.');
  }

  if (!uri) {
    console.log('  ➜ MONGODB_URI not set — starting in-memory MongoDB (dev mode)…');
    mem = await MongoMemoryServer.create();
    uri = mem.getUri();
  }

  await mongoose.connect(uri, { dbName: 'wura_grand' });
  console.log('  ➜ MongoDB connected' + (mem ? ' (in-memory)' : '') + ` — ${uri.split('@').pop().split('?')[0]}`);

  return { mem, uri };
}
