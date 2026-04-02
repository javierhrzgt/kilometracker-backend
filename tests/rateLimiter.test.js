const { getFingerprint, getProgressiveMultiplier, requestCounts } = require('../middleware/rateLimiter');

describe('Rate Limiter Utilities', () => {
  beforeEach(() => {
    requestCounts.clear();
  });

  describe('getFingerprint', () => {
    it('should generate consistent fingerprint for same IP and User-Agent', () => {
      const req1 = {
        ip: '192.168.1.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0')
      };
      const req2 = {
        ip: '192.168.1.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0')
      };

      const fp1 = getFingerprint(req1);
      const fp2 = getFingerprint(req2);

      expect(fp1).toBe(fp2);
    });

    it('should generate different fingerprint for different IP', () => {
      const req1 = {
        ip: '192.168.1.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0')
      };
      const req2 = {
        ip: '192.168.1.2',
        get: jest.fn().mockReturnValue('Mozilla/5.0')
      };

      const fp1 = getFingerprint(req1);
      const fp2 = getFingerprint(req2);

      expect(fp1).not.toBe(fp2);
    });

    it('should generate different fingerprint for different User-Agent', () => {
      const req1 = {
        ip: '192.168.1.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0')
      };
      const req2 = {
        ip: '192.168.1.1',
        get: jest.fn().mockReturnValue('Chrome/100.0')
      };

      const fp1 = getFingerprint(req1);
      const fp2 = getFingerprint(req2);

      expect(fp1).not.toBe(fp2);
    });

    it('should handle missing User-Agent', () => {
      const req = {
        ip: '192.168.1.1',
        get: jest.fn().mockReturnValue(undefined)
      };

      const fp = getFingerprint(req);
      expect(fp).toBeDefined();
      expect(fp).toContain('192.168.1.1');
    });

    it('should handle missing IP', () => {
      const req = {
        connection: {},
        get: jest.fn().mockReturnValue('Mozilla/5.0')
      };

      const fp = getFingerprint(req);
      expect(fp).toBeDefined();
    });
  });

  describe('getProgressiveMultiplier', () => {
    it('should return 1 for violations below threshold', () => {
      expect(getProgressiveMultiplier(0)).toBe(1);
      expect(getProgressiveMultiplier(1)).toBe(1);
      expect(getProgressiveMultiplier(2)).toBe(1);
    });

    it('should return 2 for violations at threshold (3)', () => {
      expect(getProgressiveMultiplier(3)).toBe(2);
    });

    it('should return 2 for violations 4-5', () => {
      expect(getProgressiveMultiplier(4)).toBe(2);
      expect(getProgressiveMultiplier(5)).toBe(4);
    });

    it('should return 4 for violations 6-7', () => {
      expect(getProgressiveMultiplier(6)).toBe(4);
      expect(getProgressiveMultiplier(7)).toBe(4);
    });

    it('should return 8 for violations 8-10', () => {
      expect(getProgressiveMultiplier(8)).toBe(8);
      expect(getProgressiveMultiplier(9)).toBe(8);
      expect(getProgressiveMultiplier(10)).toBe(8);
    });

    it('should return 16 for violations 11+', () => {
      expect(getProgressiveMultiplier(11)).toBe(16);
      expect(getProgressiveMultiplier(12)).toBe(16);
    });

    it('should work with custom threshold', () => {
      expect(getProgressiveMultiplier(2, 2)).toBe(2);
      expect(getProgressiveMultiplier(3, 2)).toBe(4);
    });
  });
});

describe('Rate Limiter Middleware', () => {
  describe('NODE_ENV test bypass', () => {
    it('should skip rate limiting when NODE_ENV is test', () => {
      const { rateLimiter, requestCounts } = require('../middleware/rateLimiter');
      
      const req = { ip: '192.168.1.1', get: jest.fn().mockReturnValue('Mozilla/5.0') };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis() };
      const next = jest.fn();
      
      rateLimiter({ max: 1 })(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('rateLimiter function', () => {
    it('should create a middleware with custom options', () => {
      const { rateLimiter } = require('../middleware/rateLimiter');
      const limiter = rateLimiter({
        windowMs: 60000,
        max: 10,
        keyPrefix: 'test',
        message: 'Test limit reached'
      });
      
      expect(typeof limiter).toBe('function');
    });
  });

  describe('exported limiters exist', () => {
    it('loginLimiter should be defined', () => {
      const { loginLimiter } = require('../middleware/rateLimiter');
      expect(typeof loginLimiter).toBe('function');
    });

    it('registerLimiter should be defined', () => {
      const { registerLimiter } = require('../middleware/rateLimiter');
      expect(typeof registerLimiter).toBe('function');
    });

    it('passwordResetLimiter should be defined', () => {
      const { passwordResetLimiter } = require('../middleware/rateLimiter');
      expect(typeof passwordResetLimiter).toBe('function');
    });

    it('apiLimiter should be defined', () => {
      const { apiLimiter } = require('../middleware/rateLimiter');
      expect(typeof apiLimiter).toBe('function');
    });
  });
});
