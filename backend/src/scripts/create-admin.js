'use strict';

/**
 * Creates (or promotes) the first platform administrator.
 *
 * Usage:
 *   npm run create-admin -- --name "Full Name" --phone 9876543210
 * The password is read from the ADMIN_PASSWORD environment variable or prompted for.
 * Refuses to run if an active ADMIN already exists, unless --force is given.
 */
const readline = require('readline');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const { User, UserRole } = require('../modules/auth/auth.model');
const { normalizeMobileNumber, isValidMobile, hashPassword } = require('../utils/auth');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => rl.output.write(s.includes(question) ? s : '');
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function main() {
  const name = (arg('name') || '').trim();
  const phone = normalizeMobileNumber(arg('phone'));
  const force = process.argv.includes('--force');

  if (!name || !isValidMobile(phone)) {
    console.error('Usage: npm run create-admin -- --name "Full Name" --phone 9876543210 [--force]');
    process.exit(1);
  }

  const password = process.env.ADMIN_PASSWORD || (await promptHidden('Password (min 8 characters): '));
  if (!password || password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  await connectDB();

  if (!force && (await User.exists({ role: UserRole.ADMIN, isActive: true }))) {
    console.error('An active admin already exists. Use --force to create another one.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const existing = await User.findOne({ phone });
  if (existing && existing.role !== UserRole.ADMIN && existing.role !== UserRole.EMPLOYEE) {
    console.error(`This phone number belongs to an existing ${existing.role} account. Use a different number.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  if (existing) {
    existing.set({ name, role: UserRole.ADMIN, permissions: [], passwordHash, isActive: true, profileComplete: true, mustChangePassword: false });
    await existing.save();
    console.log(`Promoted ${phone} to ADMIN.`);
  } else {
    await User.create({ name, phone, passwordHash, role: UserRole.ADMIN, profileComplete: true });
    console.log(`Created ADMIN ${name} (${phone}).`);
  }
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect();
  process.exit(1);
});
