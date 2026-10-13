'use strict';

// Business days are reckoned in India Standard Time regardless of the server's timezone.
const IST_OFFSET_MS = 330 * 60 * 1000;

/** Start of the current (or given) day in IST, as a UTC Date. */
function startOfDayIST(date = new Date()) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET_MS);
}

function daysAgo(days, from = new Date()) {
  return new Date(from.getTime() - days * 24 * 60 * 60 * 1000);
}

module.exports = { startOfDayIST, daysAgo, IST_OFFSET_MS };
