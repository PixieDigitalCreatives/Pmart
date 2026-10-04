import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { io } from 'socket.io-client';

dotenv.config();

async function checkEnv() {
  console.log("ENVIRONMENT PRECHECK");
  
  // 1. MONGODB
  try {
    if (!process.env.MONGODB_URI) throw new Error("Missing MONGODB_URI");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("[PASS] MongoDB Atlas connection");
    
    // Check transaction capability
    const session = await mongoose.startSession();
    session.startTransaction();
    await session.abortTransaction();
    session.endSession();
    console.log("[PASS] MongoDB transaction capability");
  } catch (e: any) {
    console.log("[FAIL] MongoDB: " + e.message);
  }

  // 2. FIREBASE
  try {
    if (process.env.FIREBASE_PROJECT_ID) {
      console.log("[PASS] Firebase Admin configuration present");
    } else {
      console.log("[FAIL] Firebase Admin configuration missing");
    }
  } catch (e: any) {
    console.log("[FAIL] Firebase: " + e.message);
  }

  // 3. MAPTILER
  if (process.env.MAPTILER_API_KEY) {
    console.log("[PASS] MapTiler configuration");
  } else {
    console.log("[FAIL] MapTiler configuration missing");
  }

  // 4. SOCKET.IO
  try {
    const socket = io('http://localhost:3000', { reconnection: false, timeout: 2000 });
    await new Promise((resolve, reject) => {
      socket.on('connect', () => resolve(true));
      socket.on('connect_error', (err) => reject(err));
    });
    console.log("[PASS] Socket.IO connection");
    socket.disconnect();
  } catch (e: any) {
    console.log("[FAIL] Socket.IO: " + e.message);
  }

  process.exit(0);
}

checkEnv();
