const rateLimit = require('express-rate-limit');

module.exports = ({ meta, config, managers }) => {
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 100, // Limit each IP to 100 requests per window
        standardHeaders: 'draft-7', // set `RateLimit` containers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        handler: (req, res, next, options) => {
            return managers.responseDispatcher.dispatch(res, {
                ok: false,
                code: 429,
                errors: 'Too many requests, please try again later.'
            });
        }
    });

    return ({ req, res, next }) => {
        /** 
         * We wrap the express-rate-limit middleware to fit 
         * into the VirtualStack (Bolt) execution flow. 
         */
        limiter(req, res, () => {
            next();
        });
    }
}
