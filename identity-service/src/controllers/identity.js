const logger = require('../utils/logger');
const { validateRegistration, validateLogin } = require('../utils/validation');
const User = require('../models/user');
const RefreshToken = require('../models/refreshToken')
const generateTokens = require('../utils/generateToken');

// user registration
const registerUser = async (req, res) => {
    logger.info('Registration endpoint hit');

    try {
        // Validate the user schema
        const { error } = validateRegistration(req.body);
        if (error) {
            logger.warn('Validation error:', error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const { username, email, password } = req.body;

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });

        if (existingUser) {
            const message = `User already exists with email: ${email} or username: ${username}`;
            logger.warn(message);
            return res.status(400).json({
                success: false,
                message
            });
        }

        // Create and save the new user
        const newUser = new User({ username, email, password });
        await newUser.save();
        logger.info(`New user registered with ID: ${newUser._id}`);

        const { accessToken, refreshToken } = await generateTokens(newUser);

        return res.status(201).json({
            success: true,
            message: 'User created',
            accessToken,
            refreshToken
        });

    } catch (error) {
        logger.error("A registration error occurred:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// User Login
const loginUser = async (req, res) => {
    logger.info('Registration endpoint hit');
    try {
        const { error } = validateLogin(req.body);

        if (error) {
            logger.warn('Validation error:', error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const { email, password } = req.body;

        let user = await User.findOne({ email });
        if (!user) {
            logger.warn('Invalid User');
            return res.status(400).json({
                success: false,
                message: "Invalid credentials"
            });
        };

        // validate password
        const isValidPassowrd = await user.comparePassword(password);
        if (!isValidPassowrd) {
            logger.warn('Invalid Passowrd');
            return res.status(400).json({
                success: false,
                message: "Invalid Passowrd"
            });
        };

        const { accessToken, refreshToken } = await generateTokens(user);

        return res.status(200).json({
            success: true,
            userId: user._id,
            accessToken,
            refreshToken,
        });


    } catch (error) {
        logger.error("A loging error occurred:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }

}


// Refresh token
const refreshTokenUser = async (req, res) => {
    logger.info("RefreshToken endpoint hiting");
    try {

        const { refreshToken } = req.body;
        if (!refreshToken) {
            logger.warn("Refresh token is missing");
            return res.status(400).json({
                success: false,
                message: "Refresh token is missing"
            });
        };

        const storeToken = await RefreshToken.findOne({ token: refreshToken });

        if (!storeToken || storeToken.expireAt < new Date()) {
            logger.error("Invalid or expire refresh token");
            return res.status(401).json({
                success: false,
                message: "Invalid or expire refresh token"
            });
        }

        const user = await User.findById(storeToken.user);
        if (!user) {
            logger.error("User not found");
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        };

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
            await generateTokens(user);

        //delete the old refresh token   
        await RefreshToken.deleteOne({ _id: storeToken._id });
        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });

    } catch (error) {
        logger.error("A Refresh token error occurred:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}



// Logout User

const logoutUser = async (req, res) => {
    logger.info("Log out endpoint hiting");
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            logger.warn("Refresh token missing");
            return res.status(400).json({
                success: false,
                message: "Refresh token missing",
            });
        }
        const storedToken = await RefreshToken.findOneAndDelete({
            token: refreshToken,
        });
        if (!storedToken) {
            logger.warn("Invalid refresh token provided");
            return res.status(400).json({
                success: false,
                message: "Invalid refresh token",
            });
        }
        logger.info("Refresh token deleted for logout");

        res.json({
            success: true,
            message: "Logged out successfully!",
        });

    } catch (error) {
        logger.info("Error while logging out", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

module.exports = { registerUser, loginUser, refreshTokenUser, logoutUser };
