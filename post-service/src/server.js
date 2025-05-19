require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const cors = require('cors');
const helmet = require('helmet');
const postRoutes = require('./routes/postRoutes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { connectToRabbitMQ } = require('./utils/rabbitmq');

const app = express();

const PORT = process.env.PORT || 8002;

// Connect to mongodb

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


// routes

app.use('/api/posts', (req, res, next) => {
    req.redisClient = redisClient;
    next();
}, postRoutes);

app.use(errorHandler);

async function startServer() {
    try {
        await connectToRabbitMQ();
        app.listen(PORT, () => {
            logger.info(`Post server running on port ${PORT}`)
        });
    } catch (error) {
        logger.error('Failed to connect to server', error);
        process.exit(1);
    }
}

startServer();
// app.listen(PORT, () => {
//     logger.info(`Post server running on port ${PORT}`)
// });

// Unhandled promis rejection

process.on("unhandledRejection", (reason, promis) => {
    logger.error("Unhandled Rejection at", promis, "reason", reason);
});