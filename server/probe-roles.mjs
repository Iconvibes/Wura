import { createApp } from './app.js';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

const app = createApp();
const mem = await MongoMemoryServer.create();
await mongoose.connect(mem.getUri(), { dbName: 'wura_grand_test' });
await User.create({ username: 'admin', password_hash: await bcrypt.hash('admin123', 4), role: 'admin' });
await User.create({ username: 'desk', password_hash: await bcrypt.hash('desk123', 4), role: 'staff' });
const login = await request(app).post('/api/admin/login').send({ username: 'desk', password: 'desk123', access_code: 'WURA-1962' });
const tok = login.body.token;
console.log('login role:', login.body.user.role);
for (const [m, url] of [['get','/api/admin/overview'],['get','/api/admin/bookings'],['get','/api/admin/rooms'],['post','/api/admin/upload'],['post','/api/admin/access-code'],['get','/api/admin/users'],['post','/api/admin/users']]) {
  const r = await request(app)[m](url).set('Authorization', `Bearer ${tok}`);
  console.log(m.toUpperCase(), url, '→', r.status, r.body.error || '');
}
await mongoose.disconnect();
await mem.stop();
