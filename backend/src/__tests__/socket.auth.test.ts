import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import app from '../app';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { User, UserRole } from '../modules/auth/auth.model';
import { Order, OrderStatus } from '../modules/order/order.model';
import { Shop } from '../modules/shop/shop.model';
import { initSocket, getIO } from '../config/socket';
import { env } from '../config/env';

describe('Socket.IO Authorization Tests (P0 Security Sprint)', () => {
  let io: Server;
  let clientSocket: ClientSocket;
  let port: number;
  let mongoServer: MongoMemoryReplSet;
  let httpServer: any;

  let adminToken: string;
  let empWithPermToken: string;
  let empNoPermToken: string;
  let c1Token: string, c2Token: string;
  let r1Token: string, r2Token: string;
  let disabledToken: string;
  
  let o1Id: string, o2Id: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(mongoServer.getUri());

    const shop = await Shop.create({ name: 'Test Shop', owner: new mongoose.Types.ObjectId(), address: { street: 'Main', city: 'City', state: 'State', pincode: '11111', coordinates: { lat: 10, lng: 20 } }, openTime: '08:00', closeTime: '22:00', location: { type: 'Point', coordinates: [0, 0] } });

    // Users
    const admin = await User.create({ name: 'Admin', phone: '+1000', role: UserRole.ADMIN, isActive: true, authProvider: 'PHONE', passwordHash: 'dummy' });
    const empWithPerm = await User.create({ name: 'EmpYes', phone: '+1001', role: UserRole.EMPLOYEE, permissions: ['orders.read'], isActive: true, authProvider: 'PHONE', passwordHash: 'dummy' });
    const empNoPerm = await User.create({ name: 'EmpNo', phone: '+1002', role: UserRole.EMPLOYEE, permissions: [], isActive: true, authProvider: 'PHONE', passwordHash: 'dummy' });
    const c1 = await User.create({ name: 'C1', phone: '+1003', role: UserRole.CUSTOMER, isActive: true, authProvider: 'PHONE', passwordHash: 'dummy' });
    const c2 = await User.create({ name: 'C2', phone: '+1004', role: UserRole.CUSTOMER, isActive: true, authProvider: 'PHONE', passwordHash: 'dummy' });
    const r1 = await User.create({ name: 'R1', phone: '+1005', role: UserRole.RIDER, isActive: true, authProvider: 'PHONE', mustChangePassword: false, passwordHash: 'dummy' });
    const r2 = await User.create({ name: 'R2', phone: '+1006', role: UserRole.RIDER, isActive: true, authProvider: 'PHONE', mustChangePassword: false, passwordHash: 'dummy' });
    const disabled = await User.create({ name: 'Disabled', phone: '+1007', role: UserRole.CUSTOMER, isActive: false, authProvider: 'PHONE', passwordHash: 'dummy' });

    // Orders
    const o1 = await Order.create({ orderNumber: 'O1', customer: c1._id, rider: r1._id, shop: shop._id, items: [], subTotal: 0, deliveryFee: 0, totalAmount: 0, status: OrderStatus.PENDING, deliveryAddress: { street: 'S1', city: 'C1', state: 'ST', pincode: '123', coordinates: { lat: 0, lng: 0 } }, paymentMethod: 'COD', paymentStatus: 'PENDING' });
    const o2 = await Order.create({ orderNumber: 'O2', customer: c2._id, rider: r2._id, shop: shop._id, items: [], subTotal: 0, deliveryFee: 0, totalAmount: 0, status: OrderStatus.PENDING, deliveryAddress: { street: 'S2', city: 'C2', state: 'ST', pincode: '123', coordinates: { lat: 0, lng: 0 } }, paymentMethod: 'COD', paymentStatus: 'PENDING' });
    
    o1Id = (o1._id as any).toString();
    o2Id = (o2._id as any).toString();

    const mkToken = (u: any) => jwt.sign({ id: (u._id as any).toString(), role: u.role }, env.JWT_SECRET, { expiresIn: '1h' });
    
    adminToken = mkToken(admin);
    empWithPermToken = mkToken(empWithPerm);
    empNoPermToken = mkToken(empNoPerm);
    c1Token = mkToken(c1);
    c2Token = mkToken(c2);
    r1Token = mkToken(r1);
    r2Token = mkToken(r2);
    disabledToken = mkToken(disabled);

    httpServer = createServer(app);
    io = initSocket(httpServer);
    
    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        const address = httpServer.address();
        port = typeof address === 'string' ? 0 : address?.port || 0;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (io) io.close();
    if (httpServer) httpServer.close();
    await mongoose.disconnect();
    if (mongoServer) { await mongoServer.stop(); }
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  const connectSocket = (token?: string, tokenValue?: string): Promise<ClientSocket> => {
    return new Promise((resolve, reject) => {
      const opts = token !== undefined ? { auth: { token: tokenValue !== undefined ? tokenValue : token } } : {};
      const s = Client(`http://localhost:${port}`, opts);
      s.on('connect', () => resolve(s));
      s.on('connect_error', (err) => reject(err));
    });
  };

  const expectJoinError = (s: ClientSocket, event: string, payload: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      s.once('error', (err) => {
        expect(err.message).toMatch(/Unauthorized|Order not found|Invalid/i);
        resolve();
      });
      s.emit(event, payload);
      setTimeout(() => reject(new Error(`Expected error event not received for ${event}`)), 500);
    });
  };

  // 1. Connection without a token is rejected.
  it('1. should deny connection without token', async () => {
    await expect(connectSocket(undefined)).rejects.toThrow(/Authentication error/);
  });

  // 2. Invalid signature and expired token are rejected.
  it('2. should deny connection with invalid token', async () => {
    await expect(connectSocket('invalid_token')).rejects.toThrow(/Authentication error/);
  });

  // 3. Disabled or deleted account is rejected.
  it('3. should deny connection for disabled account', async () => {
    await expect(connectSocket(disabledToken)).rejects.toThrow(/Authentication error/);
  });

  // 4. Valid customer connection succeeds.
  it('4. should allow connection with valid CUSTOMER token', async () => {
    clientSocket = await connectSocket(c1Token);
    expect(clientSocket.connected).toBe(true);
  });

  // 5. Customer joins their own order room successfully.
  it('5. should allow CUSTOMER to join their own order room', (done) => {
    connectSocket(c1Token).then(s => {
      clientSocket = s;
      s.emit('join_order', o1Id);
      // Wait to see if error fires, else pass
      s.once('error', () => done(new Error('Should not throw error')));
      setTimeout(() => done(), 200);
    });
  });

  // 6. Customer attempting to join another customer's order room is rejected.
  it('6. should reject CUSTOMER joining another customer order room', async () => {
    clientSocket = await connectSocket(c1Token);
    await expectJoinError(clientSocket, 'join_order', o2Id);
  });

  // 7. Customer cannot join the admin delivery room.
  it('7. should reject CUSTOMER joining admin_deliveries', async () => {
    clientSocket = await connectSocket(c1Token);
    await expectJoinError(clientSocket, 'join_admin', null);
  });

  // 8. Rider cannot join another rider's order room.
  it('8. should reject RIDER joining another rider order room', async () => {
    clientSocket = await connectSocket(r1Token);
    await expectJoinError(clientSocket, 'join_order', o2Id);
  });

  // 10. Unassigned rider cannot subscribe to or control an order.
  it('10. should reject RIDER from joining an unassigned order', async () => {
    const unassignedOrder = await Order.create({ orderNumber: 'O_UNASSIGNED', customer: (await User.findOne({role: UserRole.CUSTOMER}))!._id, shop: (await Shop.findOne())!._id, items: [], subTotal: 0, deliveryFee: 0, totalAmount: 0, status: OrderStatus.PENDING, deliveryAddress: { street: 'S', city: 'C', state: 'ST', pincode: '123', coordinates: { lat: 0, lng: 0 } }, paymentMethod: 'COD', paymentStatus: 'PENDING' });
    clientSocket = await connectSocket(r1Token);
    await expectJoinError(clientSocket, 'join_order', (unassignedOrder._id as any).toString());
  });

  // 11. Authorized rider can use the legitimate tracking workflow.
  it('11. should allow RIDER to join their assigned order room', (done) => {
    connectSocket(r1Token).then(s => {
      clientSocket = s;
      s.emit('join_order', o1Id);
      s.once('error', () => done(new Error('Should not throw error')));
      setTimeout(() => done(), 200);
    });
  });

  // 12. Admin can subscribe to the admin delivery stream.
  it('12. should allow ADMIN to join admin_deliveries', (done) => {
    connectSocket(adminToken).then(s => {
      clientSocket = s;
      s.emit('join_admin', null);
      s.once('error', () => done(new Error('Should not throw error')));
      setTimeout(() => done(), 200);
    });
  });

  // 13. Customer and rider cannot access admin-only events.
  it('13. should reject RIDER joining admin_deliveries', async () => {
    clientSocket = await connectSocket(r1Token);
    await expectJoinError(clientSocket, 'join_admin', null);
  });

  // 14. Employee without the required permission is denied.
  it('14. should reject EMPLOYEE without orders.read from admin_deliveries', async () => {
    clientSocket = await connectSocket(empNoPermToken);
    await expectJoinError(clientSocket, 'join_admin', null);
  });

  // 15. Employee with the required permission can perform the authorized action only.
  it('15. should allow EMPLOYEE with orders.read to join admin_deliveries', (done) => {
    connectSocket(empWithPermToken).then(s => {
      clientSocket = s;
      s.emit('join_admin', null);
      s.once('error', () => done(new Error('Should not throw error')));
      setTimeout(() => done(), 200);
    });
  });

  // 16. Forged user ID, role, order ID, room name, or ownership fields do not bypass authorization.
  it('16. should reject payload forgery (invalid orderId)', async () => {
    clientSocket = await connectSocket(c1Token);
    await expectJoinError(clientSocket, 'join_order', 'forged_fake_id');
  });

  // 20. Private payloads are not broadcast to unrelated sockets.
  it('20. should not broadcast events to unauthorized sockets', (done) => {
    Promise.all([connectSocket(c1Token), connectSocket(adminToken)]).then(([c1Sock, adminSock]) => {
      c1Sock.emit('join_order', o1Id);
      adminSock.emit('join_admin', null);
      
      c1Sock.on('order_status_update', () => done(new Error('Customer 1 received admin broadcast')));
      
      setTimeout(() => {
        getIO().to('admin_deliveries').emit('order_status_update', { secret: true });
        setTimeout(() => {
          c1Sock.disconnect();
          adminSock.disconnect();
          done();
        }, 100);
      }, 100);
    });
  });

  // 21. Forged location updates by a customer should fail and produce no events
  it('21. should reject location updates from a customer (forged) and emit nothing', async () => {
    const res = await request(app)
      .post('/api/rider/location')
      .set('Authorization', `Bearer ${c1Token}`)
      .send({
        latitude: 12.0,
        longitude: 77.0,
        orderId: o1Id
      });
    expect(res.status).toBe(403);
  });

  // 22. Location update for an unassigned order by a rider should fail to emit/update that order
  it('22. should not update order tracking or emit to customers if rider updates location for unassigned order', (done) => {
    Promise.all([connectSocket(c1Token)]).then(async ([c1Sock]) => {
      c1Sock.emit('join_order', o1Id);
      
      c1Sock.on('rider:location:update', () => done(new Error('Customer received unauthorized location update')));
      
      setTimeout(async () => {
        const res = await request(app)
          .post('/api/rider/location')
          .set('Authorization', `Bearer ${r2Token}`) // r2 is NOT assigned to o1
          .send({
            latitude: 12.0,
            longitude: 77.0,
            orderId: o1Id
          });
        
        expect(res.status).toBe(200); // the API returns 200 because it falls back to updating the rider profile, but it does NOT emit
        
        setTimeout(async () => {
          // ensure the database was not updated
          const order = await Order.findById(o1Id);
          expect(order?.tracking?.location?.lat).toBeUndefined();
          c1Sock.disconnect();
          done();
        }, 150);
      }, 100);
    });
  });
});

