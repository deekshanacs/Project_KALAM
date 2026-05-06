import * as fc from 'fast-check';
import { generateAccessToken, verifyAccessToken, hashToken } from '../auth.service';
import { Role } from '@tms/shared';

// Set required env vars for tests
process.env['JWT_SECRET'] = 'test-secret-that-is-at-least-32-characters-long';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-at-least-32-chars-long';
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/tms_test';
process.env['ANTHROPIC_API_KEY'] = 'test-key';

describe('auth.service', () => {
  describe('generateAccessToken + verifyAccessToken (round-trip)', () => {
    it('example: encodes and decodes admin user correctly', () => {
      const user = { id: 'user-1', email: 'alice@tms.dev', role: Role.ADMIN };
      const token = generateAccessToken(user);
      const decoded = verifyAccessToken(token);
      expect(decoded.sub).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe(user.role);
      expect(decoded.type).toBe('access');
    });

    it('example: throws on invalid token', () => {
      expect(() => verifyAccessToken('invalid.token.here')).toThrow();
    });

    it('PBT: JWT round-trip preserves sub, email, role for any valid user', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            role: fc.constantFrom<Role>(Role.ADMIN, Role.TEAM_LEADER, Role.TEAM_MEMBER, Role.JUNIOR_MEMBER),
          }),
          (user) => {
            const token = generateAccessToken(user);
            const decoded = verifyAccessToken(token);
            return decoded.sub === user.id && decoded.role === user.role && decoded.email === user.email;
          }
        ),
        { verbose: true }
      );
    });
  });

  describe('hashToken', () => {
    it('produces consistent SHA-256 hash', () => {
      const token = 'my-refresh-token';
      expect(hashToken(token)).toBe(hashToken(token));
    });

    it('produces different hashes for different tokens', () => {
      expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
    });

    it('PBT: hash is deterministic (same input = same output)', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 200 }), (token) => {
          return hashToken(token) === hashToken(token);
        }),
        { verbose: true }
      );
    });

    it('PBT: hash is always 64 hex chars (SHA-256)', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 200 }), (token) => {
          const hash = hashToken(token);
          return hash.length === 64 && /^[0-9a-f]+$/.test(hash);
        }),
        { verbose: true }
      );
    });
  });
});
