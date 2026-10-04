import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User, IUser } from '../modules/auth/auth.model';

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken; // If using cookies
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };
    const user = await User.findById(decoded.id).select('-refreshToken +passwordHash');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'User account is deactivated' });
    }

    const hasPassword = !!user.passwordHash;
    user.passwordHash = undefined; // Do not expose

    const isSetupRoute = req.originalUrl === '/api/auth/setup-password';
    const isLogoutRoute = req.originalUrl === '/api/auth/logout';
    const isMeRoute = req.originalUrl === '/api/auth/me';
    
    const isCompleteProfileRoute = req.originalUrl === '/api/auth/complete-profile';
    
    // Only enforce password if the user is a PHONE user who somehow lacks a password
    // Google users don't strictly require a password unless they want to login via phone later
    if (!hasPassword && user.authProvider === 'PHONE' && !isSetupRoute && !isLogoutRoute && !isMeRoute && !isCompleteProfileRoute) {
      return res.status(403).json({ 
        success: false, 
        code: 'NEEDS_PASSWORD_ENROLLMENT', 
        message: 'You must set a password to continue using the application.' 
      });
    }


    if (process.env.NODE_ENV !== 'production') {
      const decodedFull = jwt.decode(token) as any;
      console.log(`[AUTH] JWT Claims -> id: ${decodedFull.id}, role: ${user.role}, iat: ${decodedFull.iat}, exp: ${decodedFull.exp}`);
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes((req.user as any).role)) {
      return res.status(403).json({ success: false, message: `User role ${(req.user as any)?.role} is not authorized to access this route` });
    }
    next();
  };
};
