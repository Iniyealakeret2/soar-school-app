const rateLimitMiddleware = require('../../../mws/__rateLimit.mw');
const rateLimit = require('express-rate-limit');

jest.mock('express-rate-limit');

describe('RateLimit Middleware', () => {
    let mockReq, mockRes, mockNext, mockManagers;

    beforeEach(() => {
        mockReq = {};
        mockRes = {};
        mockNext = jest.fn();
        mockManagers = {
            responseDispatcher: {
                dispatch: jest.fn()
            }
        };
        // Reset mock
        rateLimit.mockClear();
    });

    test('should initialize express-rate-limit with correct configuration', () => {
        rateLimit.mockReturnValue(jest.fn());
        
        rateLimitMiddleware({ managers: mockManagers });

        expect(rateLimit).toHaveBeenCalledWith(expect.objectContaining({
            windowMs: 15 * 60 * 1000,
            limit: 100
        }));
    });

    test('should call the limiter and proceed to next', () => {
        const mockLimiter = jest.fn((req, res, next) => next());
        rateLimit.mockReturnValue(mockLimiter);

        const middleware = rateLimitMiddleware({ managers: mockManagers });
        middleware({ req: mockReq, res: mockRes, next: mockNext });

        expect(mockLimiter).toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalled();
    });

    test('handler should use responseDispatcher to return 429', () => {
        let handler;
        rateLimit.mockImplementation((options) => {
            handler = options.handler;
            return jest.fn();
        });

        rateLimitMiddleware({ managers: mockManagers });

        handler(mockReq, mockRes, mockNext, {});

        expect(mockManagers.responseDispatcher.dispatch).toHaveBeenCalledWith(
            mockRes,
            expect.objectContaining({
                ok: false,
                code: 429,
                errors: 'Too many requests, please try again later.'
            })
        );
    });
});
