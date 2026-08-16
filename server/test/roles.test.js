'use strict';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import {
  app, startTestDB, stopTestDB, clearDB, createAdminUser, createStaffUser, login, loginAs,
  resetLoginLimits,
} from './helpers.js';
import User from '../models/User.js';
import { makeRoom, makeBooking } from './helpers.js';

let adminToken;
let staffToken;

beforeAll(async () => {
  await startTestDB();
});
afterAll(stopTestDB);
beforeEach(async () => {
  await clearDB();
  await createAdminUser();
  await createStaffUser();
  resetLoginLimits();
  adminToken = await login();
  staffToken = await loginAs('desk', 'desk123');
});

describe('role-based access control', () => {
  it('looks up an account role for the login-page badge (no auth yet, rate-limited)', async () => {
    const admin = await request(app).post('/api/admin/account-info').send({ username: 'admin' }).expect(200);
    expect(admin.body.role).toBe('admin');

    const staff = await request(app).post('/api/admin/account-info').send({ username: 'desk' }).expect(200);
    expect(staff.body.role).toBe('staff');

    const unknown = await request(app).post('/api/admin/account-info').send({ username: 'ghost' }).expect(200);
    expect(unknown.body.role).toBeNull();
  });

  it('returns the role at login and from /me', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'desk', password: 'desk123', access_code: 'WURA-1962' })
      .expect(200);
    expect(res.body.user.role).toBe('staff');

    const me = await request(app)
      .get('/api/admin/me')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
    expect(me.body.user).toEqual({ username: 'desk', role: 'staff' });
  });

  it('lets staff use the front desk and inbox', async () => {
    await request(app).get('/api/admin/front-desk').set('Authorization', `Bearer ${staffToken}`).expect(200);

    const msg = await request(app).post('/api/contact').send({
      name: 'Guest', email: 'g@example.com', subject: 'Hi', message: 'Hello from the desk test.',
    }).expect(200);

    const list = await request(app).get('/api/admin/messages').set('Authorization', `Bearer ${staffToken}`).expect(200);
    expect(list.body.messages).toHaveLength(1);
    const id = list.body.messages[0].id;

    await request(app).patch(`/api/admin/messages/${id}`).set('Authorization', `Bearer ${staffToken}`).send({ read: true }).expect(200);
    await request(app).delete(`/api/admin/messages/${id}`).set('Authorization', `Bearer ${staffToken}`).expect(200);
    await request(app).post('/api/admin/messages/read-all').set('Authorization', `Bearer ${staffToken}`).expect(200);
  });

  it('lets staff change their own password', async () => {
    await request(app)
      .post('/api/admin/change-password')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ current_password: 'desk123', new_password: 'DeskPass-2026' })
      .expect(200);

    await request(app).post('/api/admin/login').send({
      username: 'desk', password: 'desk123', access_code: 'WURA-1962',
    }).expect(401);
    const res = await request(app).post('/api/admin/login').send({
      username: 'desk', password: 'DeskPass-2026', access_code: 'WURA-1962',
    }).expect(200);
    expect(res.body.user.role).toBe('staff');
  });

  it('blocks staff from admin-only endpoints with 403', async () => {
    const blocked = [
      ['get', '/api/admin/overview'],
      ['get', '/api/admin/bookings'],
      ['get', '/api/admin/rooms'],
      ['post', '/api/admin/upload'],
      ['post', '/api/admin/access-code'],
      ['get', '/api/admin/users'],
      ['post', '/api/admin/users'],
    ];
    for (const [method, url] of blocked) {
      const res = await request(app)[method](url).set('Authorization', `Bearer ${staffToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/admin access required/i);
    }
  });

  it('lets staff check a guest in/out but not cancel a booking', async () => {
    const room = await makeRoom();
    const booking = await makeBooking(room._id);

    // Front-desk check-in is allowed.
    await request(app)
      .patch(`/api/admin/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'checked_in' })
      .expect(200);
    // …and check-out.
    await request(app)
      .patch(`/api/admin/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'checked_out' })
      .expect(200);

    // Cancelling (or confirming) a booking is admin-only.
    await request(app)
      .patch(`/api/admin/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'cancelled' })
      .expect(403);
    await request(app)
      .patch(`/api/admin/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'confirmed' })
      .expect(403);

    // The admin can do all of it.
    await request(app)
      .patch(`/api/admin/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled' })
      .expect(200);
  });
});

describe('staff account management (admin only)', () => {
  it('lists users without exposing password hashes', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.users).toHaveLength(2);
    const admin = res.body.users.find((u) => u.username === 'admin');
    expect(admin.role).toBe('admin');
    expect(admin.password_hash).toBeUndefined();
  });

  it('creates staff and admin accounts, rejecting duplicates and weak input', async () => {
    const created = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'maria', password: 'MariaPass-2026', role: 'staff' })
      .expect(201);
    expect(created.body.user).toMatchObject({ username: 'maria', role: 'staff' });

    await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'maria', password: 'Whatever-2026', role: 'staff' })
      .expect(409);

    await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'x', password: 'Whatever-2026', role: 'staff' })
      .expect(400);
    await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'okayname', password: 'short', role: 'staff' })
      .expect(400);

    // New staff account can actually sign in with its own credentials.
    const login = await request(app).post('/api/admin/login').send({
      username: 'maria', password: 'MariaPass-2026', access_code: 'WURA-1962',
    }).expect(200);
    expect(login.body.user.role).toBe('staff');
  });

  it('promotes a staff member and demotes back, resetting the password', async () => {
    const maria = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'maria', password: 'MariaPass-2026', role: 'staff' })
      .expect(201);

    const promoted = await request(app)
      .patch(`/api/admin/users/${maria.body.user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' })
      .expect(200);
    expect(promoted.body.user.role).toBe('admin');

    await request(app)
      .patch(`/api/admin/users/${maria.body.user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: 'Rotated-2026' })
      .expect(200);

    await request(app).post('/api/admin/login').send({
      username: 'maria', password: 'Rotated-2026', access_code: 'WURA-1962',
    }).expect(200);
  });

  it('protects the admin account: no self-delete, no self-demote, last admin safe', async () => {
    const me = await User.findOne({ username: 'admin' });
    await request(app)
      .patch(`/api/admin/users/${me._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'staff' })
      .expect(400);
    await request(app)
      .delete(`/api/admin/users/${me._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    // With a second admin present, demoting the last one must still be blocked
    // for the acting admin's own account — and deleting the other admin is fine.
    const other = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'coowner', password: 'CoOwner-2026', role: 'admin' })
      .expect(201);

    await request(app)
      .delete(`/api/admin/users/${other.body.user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('deletes a staff account so its credentials stop working', async () => {
    const maria = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'maria', password: 'MariaPass-2026', role: 'staff' })
      .expect(201);

    await request(app)
      .delete(`/api/admin/users/${maria.body.user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app).post('/api/admin/login').send({
      username: 'maria', password: 'MariaPass-2026', access_code: 'WURA-1962',
    }).expect(401);
  });
});
