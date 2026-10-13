'use strict';

const { createServer } = require('http');
const { io: connect } = require('socket.io-client');
const app = require('../src/app');
const { initSocket } = require('../src/config/socket');
const { startDb, stopDb, clearDb, tokenFor, createUser, marketplace, placeOrder } = require('./helpers');

let server;
let url;
const sockets = [];

beforeAll(async () => {
  await startDb();
  server = createServer(app);
  initSocket(server);
  await new Promise((resolve) => server.listen(0, resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  sockets.splice(0).forEach((s) => s.close());
  await clearDb();
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await stopDb();
});

function open(user) {
  const socket = connect(url, { auth: user ? { token: tokenFor(user) } : {}, transports: ['websocket'], reconnection: false });
  sockets.push(socket);
  return socket;
}

const once = (socket, event, timeout = 3000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeout);
    socket.once(event, (data) => {
      clearTimeout(t);
      resolve(data);
    });
  });

async function joinOrder(user, orderId) {
  const socket = open(user);
  await once(socket, 'connect');
  socket.emit('join_order', orderId);
  try {
    const err = await once(socket, 'error', 800);
    return { joined: false, err };
  } catch {
    return { joined: true, socket };
  }
}

describe('socket authorization', () => {
  it('rejects connections without a valid token', async () => {
    const err = await once(open(null), 'connect_error');
    expect(err.message).toMatch(/Token missing/);
  });

  it('lets the customer and the owning shop join the order room, but not others', async () => {
    const m = await marketplace();
    const id = (await placeOrder(m.customer, m.address, [[m.product, 1]])).body.data._id;
    const stranger = await createUser('CUSTOMER');

    expect((await joinOrder(m.customer, id)).joined).toBe(true);
    expect((await joinOrder(m.owner, id)).joined).toBe(true);
    expect((await joinOrder(stranger, id)).joined).toBe(false);
    expect((await joinOrder(m.customer, 'not-an-id')).joined).toBe(false);
  });

  it('pushes status updates to the customer room', async () => {
    const m = await marketplace();
    const id = (await placeOrder(m.customer, m.address, [[m.product, 1]])).body.data._id;
    const { socket } = await joinOrder(m.customer, id);
    const update = once(socket, 'order_status_update');
    await require('supertest')(app).put(`/api/orders/${id}/status`).set('Authorization', `Bearer ${tokenFor(m.owner)}`).send({ status: 'ACCEPTED' });
    expect(await update).toMatchObject({ orderId: id, status: 'ACCEPTED' });
  });
});
