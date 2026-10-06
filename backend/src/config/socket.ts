import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from './env';
import { User, UserRole } from '../modules/auth/auth.model';
import { Order } from '../modules/order/order.model';

let io: Server;

export const initSocket = (server: HttpServer) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }
    
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };
      const user = await User.findById(decoded.id).select('role permissions isActive');
      
      if (!user || !user.isActive) {
        return next(new Error('Authentication error: User invalid or inactive'));
      }
      
      (socket as any).user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: Token invalid'));
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Join room for specific order tracking (for customers)
    socket.on('join_order', async (orderId) => {
      if (!orderId || typeof orderId !== 'string') return;
      const user = (socket as any).user;
      
      try {
        const order = await Order.findById(orderId).select('customer rider shop').lean();
        if (!order) {
           socket.emit('error', { message: 'Order not found' });
           return;
        }

        let canJoin = false;
        if (user.role === UserRole.ADMIN) {
           canJoin = true;
        } else if (user.role === UserRole.EMPLOYEE) {
           canJoin = user.permissions && user.permissions.includes('orders.read');
        } else if (user.role === UserRole.CUSTOMER) {
           canJoin = order.customer.toString() === user._id.toString();
        } else if (user.role === UserRole.RIDER) {
           canJoin = order.rider ? order.rider.toString() === user._id.toString() : false;
        } else if (user.role === UserRole.SHOP_OWNER) {
           canJoin = order.shop ? order.shop.toString() === user._id.toString() : false;
        }

        if (canJoin) {
          socket.join(`order_${orderId}`);
        } else {
          console.warn(`Socket ${socket.id} (User: ${user._id}) unauthorized to join order ${orderId}`);
          socket.emit('error', { message: 'Unauthorized' });
        }
      } catch (err) {
        socket.emit('error', { message: 'Invalid order ID' });
      }
    });

    // Join room for admin (all deliveries)
    socket.on('join_admin', () => {
      const user = (socket as any).user;
      if (user && user.role === UserRole.ADMIN) {
        socket.join('admin_deliveries');
      } else if (user && user.role === UserRole.EMPLOYEE && user.permissions && user.permissions.includes('orders.read')) {
        socket.join('admin_deliveries');
      } else {
        console.warn(`Socket ${socket.id} attempted to join admin room without permission`);
        socket.emit('error', { message: 'Unauthorized' });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
