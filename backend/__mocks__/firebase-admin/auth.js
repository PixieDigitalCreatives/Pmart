module.exports = { getAuth: jest.fn(() => ({ verifyIdToken: jest.fn(), getUserByEmail: jest.fn(), createUser: jest.fn() })) };
