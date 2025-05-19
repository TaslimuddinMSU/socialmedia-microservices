require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const Redis = require('ioredis');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const router = require('./routes/identity-service')
const errorHandler = require('./middleware/errorHandler');

const PORT = process.env.PORT || 8001
const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
})
    .then(() => logger.info("Connected to MongoDB"))
    .catch((error) => {
        logger.error("MongoDB connection error:", error);
        process.exit(1); // Optional: exit the process if DB connection fails
    });


const redisClient = new Redis(process.env.REDIS_URL)


// middleware
app.use(helmet());
app.use(cors());
app.use(express.json());


app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request body, ${req.body}`);
    next();
});


// DDos protection and rate limit
const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'middleware',
    points: 10,       // 10 requests
    duration: 1       // per second
});

app.use((req, res, next) => {
    rateLimiter.consume(req.ip)
        .then(() => next())
        .catch(() => {
            logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
            res.status(429).json({
                success: false,
                message: "Too many requests. Please try again later."
            });
        });
});


// IP based rate limiting for sensitive endpint

const sensitiveEndpointsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
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

// apply this sensitiveEndpointsLimiter to our routes
app.use('/api/auth/register', sensitiveEndpointsLimiter);

// main routes
app.use('/api/auth', router);

// error handler
app.use(errorHandler);


app.listen(PORT, () => {
    logger.info(`Identity service running on port: ${PORT}`)
});

process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at", promise, "reason:", reason)
});