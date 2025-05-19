
const logger = require("../utils/logger");
const jwt = require('jsonwebtoken');

const validateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger?.warn?.('Authorization header missing or invalid');
        return res.status(401).json({ message: 'Unauthorized: Missing token' });
    }
    const token = authHeader && authHeader.split(" ")[1];

    if (!token){
        logger.warn("Access attempt wthout valid token!");
        return res.status(401).json({
            message: 'Authentication required',
            success:  false
        })
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if(err){
            logger.warn("Invalid token!");
            return res.status(429).json({
                message: 'Invalid token',
                success:  false
            })
        }
        console.log("user", user.userID)
        req.user = user.userID;
        next();
    })
};

module.exports = { validateToken }