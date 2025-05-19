require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const Redis = require('ioredis');
const logger = require('./utils/logger');
const proxy = require('express-http-proxy');
const errorHandler = require('./middleware/errorHandler');
const { validateToken } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 8000;

const redisClient = new Redis(process.env.REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());




// IP based rate limiting for sensitive endpint
const rateLimitOptions = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            message: "Too many requests. Please try again later."
        });
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    }),
});


app.use(rateLimitOptions);

app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request body, ${req.body}`);
    next();
});

// Create a proxy service

const proxyOptions = {
    proxyReqPathResolver: (req) => {
        return req.originalUrl.replace(/^\/v1/, "/api");
    },
    proxyErrorHandler: (err, res, next) => {
        logger.error(`Proxy error: ${err.message}`);
        res.status(500).json({
            message: `Internal server error`,
            error: err.message
        })
    }
};

// Seting up proxy for our Identity  
app.use('/v1/auth', proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        proxyReqOpts.headers["Content-Type"] = 'application/json';
        return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyRedData, userReq, userRes) => {
        logger.info(`Response receiver from Identity service: ${proxyRes.statusCode}`);
        return proxyRedData
    }
}));


// Setting up proxy for our post service
app.use('/v1/posts',
    validateToken,
    proxy(process.env.POST_SERVICE_URL, {
        ...proxyOptions,
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            // console.log("srcReq.user.userId", srcReq.user)
            proxyReqOpts.headers["Content-Type"] = 'application/json';
            proxyReqOpts.headers["x-user-id"] = srcReq.user;
            return proxyReqOpts;
        },
        userResDecorator: (proxyRes, proxyRedData, userReq, userRes) => {
            logger.info(`Response receiver from post service: ${proxyRes.statusCode}`);
            return proxyRedData
        }
    }));

// Setting up proxy for media service
app.use('/v1/media', validateToken,
    proxy(process.env.MEDIA_SERVICE_URL, {
        ...proxyOptions,
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            // console.log("srcReq.user.userId", srcReq.user)
            proxyReqOpts.headers["x-user-id"] = srcReq.user;
            if (!srcReq.headers["content-type"].startsWith("multipart/form-data")) {
                proxyReqOpts.headers["Content-Type"] = "application/json";
            }
            return proxyReqOpts;
        },
        userResDecorator: (proxyRes, proxyRedData, userReq, userRes) => {
            logger.info(`Response receiver from media service: ${proxyRes.statusCode}`);
            return proxyRedData;
        },
        parseReqBody: false,
    }),
);


// Setting up proxy for our Search service
app.use('/v1/search',
    validateToken,
    proxy(process.env.SEARCH_SERVICE_URL, {
        ...proxyOptions,
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            // console.log("srcReq.user.userId", srcReq.user)
            proxyReqOpts.headers["Content-Type"] = 'application/json';
            proxyReqOpts.headers["x-user-id"] = srcReq.user;
            return proxyReqOpts;
        },
        userResDecorator: (proxyRes, proxyRedData, userReq, userRes) => {
            logger.info(`Response receiver from search service: ${proxyRes.statusCode}`);
            return proxyRedData
        }
    }));

app.use(errorHandler);


app.listen(PORT, () => {
    logger.info(`API Gateway is running on port ${PORT}`);
    logger.info(`Identity service is running on port ${process.env.IDENTITY_SERVICE_URL}`);
    logger.info(`Post service is running on port ${process.env.POST_SERVICE_URL}`);
    logger.info(`Post media is running on port ${process.env.MEDIA_SERVICE_URL}`);
    logger.info(`Search is running on port ${process.env.SEARCH_SERVICE_URL}`);
    logger.info(`Redis Url is running on port ${process.env.REDIS_URL}`);
});


