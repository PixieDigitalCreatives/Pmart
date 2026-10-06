import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { UserRole } from './auth.model';
import { z } from 'zod';
import { logger } from '../../utils/logger';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().min(1, 'Phone is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  password: z.string().min(1, 'Password is required'),
});

const setupPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const googleLoginSchema = z.object({
  idToken: z.string().min(1, 'ID Token is required'),
});

const completeProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().min(1, 'Phone is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export class AuthController {
  
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, phone, password } = registerSchema.parse(req.body);
      const result = await AuthService.registerCustomer({ name, phone, password });
      
      logger.info(`Successful registration for user ${(result.user as any)._id} from IP: ${req.ip || req.socket.remoteAddress}`);
      
      setRefreshCookie(res, result.refreshToken);

      res.status(201).json({
        success: true,
        user: {
          id: (result.user as any)._id,
          name: result.user.name,
          phone: result.user.phone,
          role: result.user.role,
          profileComplete: result.user.profileComplete,
        },
        profileComplete: result.user.profileComplete,
        accessToken: result.accessToken,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already associated')) {
        logger.warn(`Failed registration attempt for ${req.body.phone} from IP: ${req.ip || req.socket.remoteAddress}`);
        return res.status(409).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, password } = loginSchema.parse(req.body);
      const result = await AuthService.login({ phone, password });
      
      logger.info(`Successful login for user ${(result.user as any)._id} from IP: ${req.ip || req.socket.remoteAddress}`);
      
      setRefreshCookie(res, result.refreshToken);

      res.json({
        success: true,
        user: {
          id: (result.user as any)._id,
          name: result.user.name,
          phone: result.user.phone,
          role: result.user.role,
          profileComplete: result.user.profileComplete,
          mustChangePassword: result.user.mustChangePassword,
        },
        profileComplete: result.user.profileComplete,
        accessToken: result.accessToken,
      });
    } catch (error) {
      if (error instanceof Error && (error.message.includes('credentials') || error.message.includes('deactivated'))) {
        logger.warn(`Failed login attempt for ${req.body.phone} from IP: ${req.ip || req.socket.remoteAddress}`);
        return res.status(401).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  static async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { idToken } = googleLoginSchema.parse(req.body);
      const result = await AuthService.googleLogin(idToken);
      
      setRefreshCookie(res, result.refreshToken);

      res.json({
        success: true,
        user: {
          id: (result.user as any)._id,
          name: result.user.name,
          phone: result.user.phone,
          email: result.user.email,
          role: result.user.role,
          profileComplete: result.user.profileComplete,
        },
        profileComplete: result.user.profileComplete,
        accessToken: result.accessToken,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('deactivated')) {
        return res.status(401).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  static async completeProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized' });
      }
      const data = completeProfileSchema.parse(req.body);
      const user = await AuthService.completeProfile((req.user as any)._id.toString(), data);
      
      res.json({ 
        success: true, 
        message: 'Profile completed successfully',
        user: {
          id: (user as any)._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          profileComplete: user.profileComplete,
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already associated')) {
        return res.status(409).json({ success: false, message: error.message });
      }
      next(error);
    }
  }


  static async setupPassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized' });
      }
      const { password } = setupPasswordSchema.parse(req.body);
      await AuthService.setupPassword((req.user as any)._id.toString(), password);
      
      res.json({ success: true, message: 'Password setup successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async enrollRider(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ success: false, message: 'Token and password are required' });
      }
      
      await AuthService.enrollRider(token, password);
      res.json({ success: true, message: 'Rider enrolled successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ success: false, message: 'No refresh token provided' });
      }

      const result = await AuthService.refreshTokens(refreshToken);
      setRefreshCookie(res, result.refreshToken);

      res.json({
        success: true,
        accessToken: result.accessToken
      });
    } catch (error) {
      res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user) {
        await AuthService.logout((req.user as any)._id.toString());
      }
      res.clearCookie('refreshToken');
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
         return res.status(401).json({ success: false, message: 'Not authorized' });
      }
      res.json({
        success: true,
        user: {
          id: (req.user as any)._id,
          name: req.user.name,
          phone: req.user.phone,
          email: req.user.email,
          role: req.user.role,
          isActive: req.user.isActive,
          profileComplete: req.user.profileComplete,
          mustChangePassword: req.user.mustChangePassword
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized' });
      }
      
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ success: false, message: 'Current password, new password, and confirmation are required' });
      }
      
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'New passwords do not match' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long' });
      }

      const result = await AuthService.changePassword((req.user as any)._id.toString(), currentPassword, newPassword);
      setRefreshCookie(res, result.refreshToken);

      res.json({
        success: true,
        message: 'Password changed successfully',
        accessToken: result.accessToken
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Incorrect current password')) {
        return res.status(401).json({ success: false, message: error.message });
      }
      next(error);
    }
  }
}
