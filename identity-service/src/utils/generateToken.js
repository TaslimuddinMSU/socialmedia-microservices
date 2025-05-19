const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/refreshToken');


const generateTokens = async (user) => {
    const accessToken = jwt.sign(
        {
            userID: user._id,
            username: user.username,
        },
        process.env.JWT_SECRET,
        { expiresIn: '60m' } 
    );

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expireAt = new Date();

    expireAt.setDate(expireAt.getDate() + 7 ) // Refresh token expire in 7 days

    await RefreshToken.create({
        token:  refreshToken,
        user: user._id,
        expireAt
    })

    return {accessToken, refreshToken}; 
};

module.exports = generateTokens;
