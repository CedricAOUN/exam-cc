const express = require('express');
const proxy = require('express-http-proxy');
const router = express.Router();
router.use(
  '/',
  proxy(process.env.STOCK_SERVICE_URL, {
    timeout: 3000,
    limit: '32kb',
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyReqOptDecorator: (options) => {
      // User cookies and authentication headers must never reach internal services.
      delete options.headers.cookie;
      delete options.headers.authorization;
      options.headers['x-service-token'] = process.env.SERVICE_TOKEN;
      return options;
    },
  }),
);
module.exports = router;
