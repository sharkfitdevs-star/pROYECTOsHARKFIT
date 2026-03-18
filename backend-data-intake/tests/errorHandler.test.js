const { errorHandler } = require('../src/middleware/errorHandler');
const { logger } = require('../src/utils/logger');

describe('errorHandler middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { path: '/test', method: 'GET' };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });


  test('returns standard payload and includes stack in development', () => {
    process.env.NODE_ENV = 'development';
    const err = new Error('boom');
    err.stack = 'line1\nline2\nline3\nline4\nline5\nline6';
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.ok).toBe(false);
    expect(payload.error).toBe('INTERNAL_SERVER_ERROR');
    expect(payload.stack).toMatch(/line1/);
  });

  test('hides stack in production', () => {
    process.env.NODE_ENV = 'production';
    const err = new Error('oops');
    err.stack = 'stack1\nstack2';
    errorHandler(err, req, res, next);
    const payload = res.json.mock.calls[0][0];
    expect(payload.stack).toBeUndefined();
    expect(payload.error).toBe('INTERNAL_SERVER_ERROR');
  });
});
