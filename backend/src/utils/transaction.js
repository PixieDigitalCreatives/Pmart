'use strict';

const mongoose = require('mongoose');

/**
 * Runs `work(session)` inside a MongoDB transaction.
 * The driver retries the callback on transient errors (e.g. write conflicts), so `work`
 * must re-read everything it depends on from the database on each attempt.
 */
async function runInTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { runInTransaction };
