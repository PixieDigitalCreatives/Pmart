'use strict';

const { verifyAccessToken } = require('../utils/jwt');
const { User, UserRole } = require('../modules/auth/auth.model');

const PASSWORD_CHANGE_EXEMPT = new Set(['/api/auth/password', '/api/auth/logout', '/api/auth/me']);

function hasPermission(user, permission) {
  if (!user) return false;
  if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) return true;
  return user.role === UserRole.EMPLOYEE && Array.isArray(user.permissions) && user.permissions.includes(permission);
}

/** Verifies the bearer access token and attaches the active user to req.user. */
const protect = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const bearerToken = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  const cookieToken = req.cookies && req.cookies.accessToken;
  const token = bearerToken || cookieToken;

  if (!token) {
    return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Not authorized, no token' });
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    return res.status(401).json({ success: false, code: 'TOKEN_INVALID', message: 'Not authorized, token failed' });
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Not authorized, user not found' });
  }
  if (!user.isActive) {
    return res.status(401).json({ success: false, code: 'ACCOUNT_DEACTIVATED', message: 'User account is deactivated' });
  }
  if (decoded.ver !== undefined && user.tokenVersion !== undefined && decoded.ver < user.tokenVersion) {
    return res.status(401).json({ success: false, code: 'TOKEN_REVOKED', message: 'Session expired or password changed. Please sign in again.' });
  }

  const path = req.originalUrl.split('?')[0].replace(/\/$/, '');
  if (user.mustChangePassword && !PASSWORD_CHANGE_EXEMPT.has(path)) {
    return res.status(403).json({
      success: false,
      code: 'MUST_CHANGE_PASSWORD',
      message: 'You must change your initial password to continue.'
    });
  }

  req.user = user;
  next();
};

/** Allows only the listed roles. SUPER_ADMIN implicitly satisfies ADMIN role. */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'You are not allowed to access this resource' });
  }
  const isAllowed = roles.includes(req.user.role) || (req.user.role === UserRole.SUPER_ADMIN && roles.includes(UserRole.ADMIN));
  if (!isAllowed) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'You are not allowed to access this resource' });
  }
  next();
};

/** Allows ADMIN, or an EMPLOYEE that holds the given permission. */
const authorizePermission = (permission) => (req, res, next) => {
  if (!hasPermission(req.user, permission)) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message: `Missing permission: ${permission}` });
  }
  next();
};

/** Attaches req.user if a valid token is present; does not block unauthenticated requests. */
const optionalProtect = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const bearerToken = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  const cookieToken = req.cookies && req.cookies.accessToken;
  const token = bearerToken || cookieToken;

  if (!token) return next();

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);
    if (user && user.isActive) {
      if (decoded.ver === undefined || user.tokenVersion === undefined || decoded.ver >= user.tokenVersion) {
        req.user = user;
      }
    }
  } catch {
    // Ignore invalid tokens for optional auth
  }
  next();
};

/** Allows ADMIN, or an EMPLOYEE that holds at least one of the given permissions. */
const authorizeAny = (...permissions) => (req, res, next) => {
  if (!permissions.some((p) => hasPermission(req.user, p))) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message: `Missing permission: ${permissions.join(' or ')}` });
  }
  next();
};

module.exports = { protect, optionalProtect, authorize, authorizePermission, authorizeAny, hasPermission };
