const { verifyAccessToken } = require('../utils/tokenUtils');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        const error = new Error('Not authorized to access this route');
        error.statusCode = 401;
        return next(error);
    }

    try {
        const decoded = verifyAccessToken(token);
        if (!decoded) {
            const error = new Error('Not authorized, access token failed or expired');
            error.statusCode = 401;
            return next(error);
        }

        // token payload now contains user_id instead of id
        const user = await User.findById(decoded.user_id);
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            return next(error);
        }

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            const error = new Error(`User role ${req.user.role} is not authorized to access this route`);
            error.statusCode = 403;
            return next(error);
        }
        next();
    };
};

const optionalProtect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next();
    }

    try {
        const decoded = verifyAccessToken(token);
        if (!decoded) {
            return next();
        }

        const user = await User.findById(decoded.user_id);
        if (user) {
            req.user = user;
        }
        next();
    } catch (error) {
        next();
    }
};

module.exports = { protect, authorize, optionalProtect };
