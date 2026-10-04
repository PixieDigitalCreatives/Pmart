import jwt from 'jsonwebtoken';
import { env } from './src/config/env';
import dotenv from 'dotenv';
dotenv.config();
console.log(jwt.sign({ id: '6ac215ea30068554699d5623', role: 'CUSTOMER' }, env.JWT_SECRET));
