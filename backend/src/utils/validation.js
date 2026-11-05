'use strict';

const mongoose = require('mongoose');
const { z } = require('zod');
const { badRequest } = require('./http-error');
const { normalizeMobileNumber, isValidMobile, validatePasswordStrength } = require('./auth');

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid id');

const phone = z
  .string()
  .min(1, 'Phone is required')
  .transform((v) => normalizeMobileNumber(v))
  .refine((v) => isValidMobile(v), 'Enter a valid mobile number');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .refine((v) => validatePasswordStrength(v).valid, (v) => ({ message: validatePasswordStrength(v).message }));

/** Throws a 400 unless the value is a valid ObjectId string. */
function assertObjectId(value, label = 'id') {
  if (!mongoose.isValidObjectId(value)) throw badRequest(`Invalid ${label}`, 'INVALID_ID');
  return value;
}

/** Parses page/limit query params with an upper bound on limit. */
function parsePagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

/** Accepts a search string of at most 100 characters; returns '' when absent. */
function parseSearch(value) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') throw badRequest('Invalid search query type', 'INVALID_SEARCH');
  const trimmed = value.trim();
  if (trimmed.length > 100) throw badRequest('Search query too long', 'INVALID_SEARCH');
  return trimmed;
}

module.exports = { z, objectId, phone, password, assertObjectId, parsePagination, parseSearch };
