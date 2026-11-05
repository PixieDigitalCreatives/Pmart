'use strict';

const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

// Access tokens are HS256-signed with JWT_SECRET and carry a fixed issuer/audience, so a token signed for
// anything else with the same secret, or with another algorithm, is refused.
const ACCESS_TOKEN = Object.freeze({ algorithm: 'HS256', issuer: 'pmart-api', audience: 'pmart-app' });

function signAccessToken(userId, tokenVersion = 1) {
  return jwt.sign({ id: String(userId), ver: tokenVersion }, env.JWT_SECRET, {
    algorithm: ACCESS_TOKEN.algorithm,
    issuer: ACCESS_TOKEN.issuer,
    audience: ACCESS_TOKEN.audience,
    expiresIn: env.JWT_EXPIRES_IN
  });
}

/** Returns the decoded payload or throws (expired, wrong signature, algorithm, issuer or audience). */
function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: [ACCESS_TOKEN.algorithm],
    issuer: ACCESS_TOKEN.issuer,
    audience: ACCESS_TOKEN.audience
  });
}

module.exports = { ACCESS_TOKEN, signAccessToken, verifyAccessToken };
