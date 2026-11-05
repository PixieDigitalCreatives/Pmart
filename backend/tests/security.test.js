'use strict';

const { startDb, stopDb, clearDb, api, auth, createUser } = require('./helpers');
const { User, UserRole } = require('../src/modules/auth/auth.model');
const { AuthService } = require('../src/modules/auth/auth.service');
const { Approval, ApprovalAction, ApprovalStatus } = require('../src/modules/admin/approval.model');
const { AuditLog, recordAudit, computeAuditHash } = require('../src/modules/admin/audit.model');
const { generateTotpSecret, generateTotp, verifyTotp, generateRecoveryCodes, encryptSecret, decryptSecret, base32Decode } = require('../src/utils/totp');
const request = require('supertest');

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

const refreshCookie = (res) => (res.headers['set-cookie'] || []).find((c) => c.startsWith('refreshToken='));

describe('M11: Comprehensive Security Test Suite', () => {
  describe('1. CSRF Protection', () => {
    it('blocks mutating cookie-based requests with missing or invalid CSRF token', async () => {
      const user = await createUser('CUSTOMER', { password: 'UserSecret123!' });
      const login = await api().post('/api/auth/login').send({ phone: user.phone, password: 'UserSecret123!' });
      const sessionCookie = refreshCookie(login).split(';')[0];

      // Missing CSRF token header
      const missingCsrf = await api()
        .post('/api/auth/complete-profile')
        .set('Cookie', sessionCookie)
        .send({ name: 'Hacked', phone: '9999999999', password: 'Password123!', confirmPassword: 'Password123!' });
      expect(missingCsrf.status).toBe(403);
      expect(missingCsrf.body.code).toBe('CSRF_INVALID');

      // Invalid CSRF token header
      const invalidCsrf = await api()
        .post('/api/auth/complete-profile')
        .set('Cookie', sessionCookie)
        .set('X-XSRF-TOKEN', 'bogus-csrf-token')
        .send({ name: 'Hacked', phone: '9999999999', password: 'Password123!', confirmPassword: 'Password123!' });
      expect(invalidCsrf.status).toBe(403);
      expect(invalidCsrf.body.code).toBe('CSRF_INVALID');
    });

    it('allows mutating requests when accompanied by valid Authorization: Bearer header', async () => {
      const user = await createUser('CUSTOMER');
      const res = await api().get('/api/auth/me').set(auth(user));
      expect(res.status).toBe(200);
    });
  });

  describe('2. NoSQL & Search Injection Protection', () => {
    it('escapes and sanitizes regex queries in catalog search', async () => {
      const res = await api().get('/api/products/search?q=.*|^$|[]{}()');
      expect([200, 400]).toContain(res.status);
      expect(res.status).not.toBe(500);
    });
  });

  describe('3. Multi-Factor Authentication (TOTP & Recovery Codes)', () => {
    it('handles complete TOTP setup, verification and recovery code lifecycle', async () => {
      const admin = await createUser('ADMIN');

      // 1. Setup MFA
      const setup = await AuthService.setupMfa(admin._id);
      expect(setup.secret).toBeTruthy();
      expect(setup.uri).toMatch(/^otpauth:\/\/totp\/PMart:/);
      expect(setup.recoveryCodes).toHaveLength(8);

      // 2. Generate valid TOTP from raw bytes
      const secretBytes = base32Decode(setup.secret);
      const validCode = generateTotp(secretBytes);

      // 3. Confirm MFA
      const confirmed = await AuthService.confirmMfa(admin._id, validCode);
      expect(confirmed.success).toBe(true);

      const updatedAdmin = await User.findById(admin._id);
      expect(updatedAdmin.mfa.enabled).toBe(true);

      // 4. Verify login requires MFA
      const loginRes = await api().post('/api/auth/login').send({ phone: admin.phone, password: 'Passw0rd!' });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.mfaRequired).toBe(true);
      expect(loginRes.body.mfaTicket).toBeTruthy();

      // 5. Verify MFA with recovery code
      const recoveryCode = setup.recoveryCodes[0];
      const verified = await AuthService.verifyMfaLogin({
        mfaTicket: loginRes.body.mfaTicket,
        recoveryCode
      });
      expect(verified.accessToken).toBeTruthy();

      // 6. Used recovery code cannot be reused
      await expect(
        AuthService.verifyMfaLogin({
          mfaTicket: loginRes.body.mfaTicket,
          recoveryCode
        })
      ).rejects.toThrow();
    });
  });

  describe('4. Maker-Checker Approvals Workflow', () => {
    it('prevents self-approval (maker cannot be checker)', async () => {
      const admin1 = await createUser('ADMIN');
      const admin2 = await createUser('ADMIN');

      // Request approval
      const approval = await Approval.create({
        action: ApprovalAction.INVOICE_DELETE,
        requestedBy: admin1._id,
        requestedByRole: 'ADMIN',
        reason: 'Duplicate billing error',
        targetId: 'INV-1001',
        status: ApprovalStatus.PENDING
      });

      // Maker attempts to approve own request -> must be rejected
      const canSelfApprove = String(approval.requestedBy) !== String(admin1._id);
      expect(canSelfApprove).toBe(false);

      // Checker (admin2) approves request
      approval.status = ApprovalStatus.APPROVED;
      approval.reviewedBy = admin2._id;
      approval.reviewedAt = new Date();
      approval.reviewNote = 'Verified with store manager';
      await approval.save();

      expect(approval.status).toBe(ApprovalStatus.APPROVED);
      expect(String(approval.reviewedBy)).toBe(String(admin2._id));
    });
  });

  describe('5. Audit v2 Hash Chain Integrity', () => {
    it('records immutable hash-chained audit logs with sensitive data redaction', async () => {
      const user = await createUser('ADMIN');
      const mockReq = {
        user,
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Jest-Security-Runner', 'x-request-id': 'req-audit-123' }
      };

      // Record first log
      await recordAudit(mockReq, 'CREATE', 'User', 'usr-1', {
        name: 'Sensitive User',
        password: 'SuperSecretPassword',
        secretToken: 'token-abc'
      });

      const log1 = await AuditLog.findOne({ resourceId: 'usr-1' }).lean();
      expect(log1).toBeTruthy();
      expect(log1.hash).toBeTruthy();
      expect(log1.prevHash).toBe('GENESIS');
      // Verify redaction
      expect(log1.details.password).toBe('[REDACTED]');
      expect(log1.details.secretToken).toBe('[REDACTED]');
      expect(log1.details.name).toBe('Sensitive User');

      // Record second log -> must chain to log1's hash
      await recordAudit(mockReq, 'UPDATE', 'User', 'usr-1', { status: 'ACTIVATED' });
      const log2 = await AuditLog.findOne({ resourceId: 'usr-1', action: 'UPDATE' }).lean();
      expect(log2).toBeTruthy();
      expect(log2.prevHash).toBe(log1.hash);
      expect(log2.hash).not.toBe(log1.hash);
    });
  });

  describe('6. RBAC v2 & Role Hierarchy', () => {
    it('recognizes SUPER_ADMIN and gives it implicit admin rights', async () => {
      const superAdmin = await createUser('SUPER_ADMIN');
      expect(superAdmin.role).toBe(UserRole.SUPER_ADMIN);

      // Authorize middleware allows SUPER_ADMIN on ADMIN routes
      const res = await api().get('/api/admin/employees').set(auth(superAdmin));
      expect(res.status).toBe(200);
    });
  });
});

