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

        if (user.status === 0) {
            const error = new Error('Your account has been suspended.');
            error.statusCode = 403;
            return next(error);
        }

        if (user.permissions && typeof user.permissions === 'string') {
            try {
                user.permissions = JSON.parse(user.permissions);
            } catch (e) {
                user.permissions = null;
            }
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

const checkPermission = (moduleName, action) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            const error = new Error('Authentication required');
            error.statusCode = 401;
            return next(error);
        }

        // Super Admin has absolute, unrestricted access to everything
        if (user.role === 'superadmin') {
            return next();
        }

        if (user.role === 'subadmin') {
            let permissions = user.permissions;
            if (typeof permissions === 'string') {
                try {
                    permissions = JSON.parse(permissions);
                } catch (e) {
                    permissions = null;
                }
            }

            if (permissions && permissions[moduleName] && permissions[moduleName].includes(action)) {
                return next();
            }
        }

        const error = new Error(`Forbidden: You do not have permission to ${action} ${moduleName}`);
        error.statusCode = 403;
        return next(error);
    };
};

const optionalProtect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token || token === 'null' || token === 'undefined') {
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

module.exports = { protect, authorize, checkPermission, optionalProtect };
