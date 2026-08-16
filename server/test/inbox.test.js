'use strict';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app, startTestDB, stopTestDB, clearDB, createAdminUser, login, resetLoginLimits } from './helpers.js';
import { __resetContactLimits } from '../routes/public.js';
import mongoose from 'mongoose';
import Message from '../models/Message.js';

beforeAll(async () => {
  await startTestDB();
  await createAdminUser();
});
afterAll(stopTestDB);
beforeEach(async () => {
  await clearDB();
  await createAdminUser();
  __resetContactLimits();
  resetLoginLimits();
});

const enquiry = {
  name: 'Amara Okafor',
  email: 'amara@example.com',
  subject: 'Reservation enquiry',
  message: 'Two nights in the Deluxe Garden, please.',
};

async function postEnquiry(overrides = {}) {
  await request(app).post('/api/contact').send({ ...enquiry, ...overrides }).expect(200);
}

describe('admin inbox API', () => {
  it('lists contact-form messages as unread, newest first', async () => {
    await postEnquiry({ name: 'First Guest' });
    await postEnquiry({ name: 'Second Guest' });

    const res = await request(app)
      .get('/api/admin/messages')
      .set('Authorization', `Bearer ${await login()}`)
      .expect(200);

    expect(res.body.messages).toHaveLength(2);
    expect(res.body.unread).toBe(2);
    expect(res.body.messages[0].name).toBe('Second Guest');
    expect(res.body.messages[1].name).toBe('First Guest');
    expect(res.body.messages[0].read).toBe(false);
    expect(res.body.messages[0].subject).toBe('Reservation enquiry');
    expect(res.body.messages[0].message).toContain('Deluxe Garden');
  });

  it('paginates with limit/offset and reports the total', async () => {
    await postEnquiry({ name: 'Guest One' });
    await postEnquiry({ name: 'Guest Two' });
    await postEnquiry({ name: 'Guest Three' });

    const page1 = await request(app)
      .get('/api/admin/messages?limit=2&offset=0')
      .set('Authorization', `Bearer ${await login()}`)
      .expect(200);
    expect(page1.body.messages).toHaveLength(2);
    expect(page1.body.total).toBe(3);
    expect(page1.body.messages[0].name).toBe('Guest Three'); // newest first
    expect(page1.body.messages[1].name).toBe('Guest Two');

    const page2 = await request(app)
      .get('/api/admin/messages?limit=2&offset=2')
      .set('Authorization', `Bearer ${await login()}`)
      .expect(200);
    expect(page2.body.messages).toHaveLength(1);
    expect(page2.body.messages[0].name).toBe('Guest One');
    expect(page2.body.total).toBe(3);
  });

  it('returns an empty window past the end and keeps unread global', async () => {
    await postEnquiry({ name: 'A' });
    await postEnquiry({ name: 'B' });
    const first = await Message.findOne({ name: 'A' }).lean();
    await request(app)
      .patch(`/api/admin/messages/${first._id}`)
      .set('Authorization', `Bearer ${await login()}`)
      .send({ read: true })
      .expect(200);

    const tail = await request(app)
      .get('/api/admin/messages?limit=2&offset=5')
      .set('Authorization', `Bearer ${await login()}`)
      .expect(200);
    expect(tail.body.messages).toHaveLength(0);
    expect(tail.body.total).toBe(2);
    expect(tail.body.unread).toBe(1); // counts the whole box, not the window
  });

  it('defaults to 25 and caps the limit at 50', async () => {
    for (let i = 0; i < 55; i++) {
      __resetContactLimits(); // contact form allows only 5 per window
      await postEnquiry({ name: `Bulk ${i}` });
    }

    const byDefault = await request(app)
      .get('/api/admin/messages')
      .set('Authorization', `Bearer ${await login()}`)
      .expect(200);
    expect(byDefault.body.messages).toHaveLength(25);
    expect(byDefault.body.total).toBe(55);

    const capped = await request(app)
      .get('/api/admin/messages?limit=999')
      .set('Authorization', `Bearer ${await login()}`)
      .expect(200);
    expect(capped.body.messages).toHaveLength(50);
  });

  it('marks a message read, and unread again', async () => {
    await postEnquiry();
    const msg = await Message.findOne().lean();

    const read = await request(app)
      .patch(`/api/admin/messages/${msg._id}`)
      .set('Authorization', `Bearer ${await login()}`)
      .send({ read: true })
      .expect(200);
    expect(read.body.message.read).toBe(true);

    const list = await request(app)
      .get('/api/admin/messages')
      .set('Authorization', `Bearer ${await login()}`)
      .expect(200);
    expect(list.body.unread).toBe(0);

    await request(app)
      .patch(`/api/admin/messages/${msg._id}`)
      .set('Authorization', `Bearer ${await login()}`)
      .send({ read: false })
      .expect(200);
    const list2 = await request(app)
      .get('/api/admin/messages')
      .set('Authorization', `Bearer ${await login()}`)
      .expect(200);
    expect(list2.body.unread).toBe(1);
  });

  it('rejects a non-boolean read value', async () => {
    await postEnquiry();
    const msg = await Message.findOne().lean();
    await request(app)
      .patch(`/api/admin/messages/${msg._id}`)
      .set('Authorization', `Bearer ${await login()}`)
      .send({ read: 'yes' })
      .expect(400);
  });

  it('marks every message read in one call', async () => {
    await postEnquiry({ name: 'A' });
    await postEnquiry({ name: 'B' });
    await postEnquiry({ name: 'C' });

    await request(app)
      .post('/api/admin/messages/read-all')
      .set('Authorization', `Bearer ${await login()}`)
      .expect(200);

    const list = await request(app)
      .get('/api/admin/messages')
      .set('Authorization', `Bearer ${await login()}`)
      .expect(200);
    expect(list.body.unread).toBe(0);
    expect(list.body.messages.every((m) => m.read)).toBe(true);
  });

  it('deletes a message', async () => {
    await postEnquiry();
    const msg = await Message.findOne().lean();

    await request(app)
      .delete(`/api/admin/messages/${msg._id}`)
      .set('Authorization', `Bearer ${await login()}`)
      .expect(200);

    const list = await request(app)
      .get('/api/admin/messages')
      .set('Authorization', `Bearer ${await login()}`)
      .expect(200);
    expect(list.body.messages).toHaveLength(0);
  });

  it('404s on an unknown message id', async () => {
    await request(app)
      .patch(`/api/admin/messages/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${await login()}`)
      .send({ read: true })
      .expect(404);
  });

  it('requires an admin token', async () => {
    await request(app).get('/api/admin/messages').expect(401);
  });
});
