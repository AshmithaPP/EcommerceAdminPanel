const authService = require('../services/authService');
const { signupSchema, loginSchema } = require('../validators/authValidator');

// Helper to set cookie
const setRefreshTokenCookie = (res, token) => {
    const cookieOptions = {
        httpOnly: true,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax', // or 'None' with secure: true for cross-domain
    };
    res.cookie('refreshToken', token, cookieOptions);
};

const authController = {
    signup: async (req, res, next) => {
        try {
            const { error } = signupSchema.validate(req.body);
            if (error) {
                const validateError = new Error(error.details[0].message);
                validateError.statusCode = 400;
                throw validateError;
            }

            const result = await authService.register(req.body);

            // Set refresh token in cookie
            setRefreshTokenCookie(res, result.refreshToken);

            // Don't send refreshToken in JSON body
            delete result.refreshToken;

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    login: async (req, res, next) => {
        try {
            const { error } = loginSchema.validate(req.body);
            if (error) {
                const validateError = new Error(error.details[0].message);
                validateError.statusCode = 400;
                throw validateError;
            }

            const { email, password } = req.body;
            const result = await authService.login(email, password);

            // Set refresh token in cookie
            setRefreshTokenCookie(res, result.refreshToken);

            // Don't send refreshToken in JSON body
            delete result.refreshToken;

            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: result
            });
        } catch (error) {
            if (error.message === 'User already logged in. Please logout first.') {
                return res.status(403).json({
                    success: false,
                    message: error.message,
                    data: { user_id: error.user_id }
                });
            }
            next(error);
        }
    },

    refresh: async (req, res, next) => {
        try {
            // Get refresh token from cookies
            const refreshToken = req.cookies.refreshToken;

            if (!refreshToken) {
                const error = new Error('Refresh token is required');
                error.statusCode = 400;
                throw error;
            }

            const tokens = await authService.refresh(refreshToken);

            // Set the new rotated refresh token in cookie
            setRefreshTokenCookie(res, tokens.refreshToken);

            res.status(200).json({
                success: true,
                message: 'Tokens refreshed successfully',
                data: {
                    accessToken: tokens.accessToken
                }
            });
        } catch (error) {
            next(error);
        }
    },

    logout: async (req, res, next) => {
        try {
            // Use optional chaining for maximum safety
            const token = req.cookies?.refreshToken;
            const userId = req.body?.user_id || req.body?.admin_id || req.body?.customer_id;

            console.log('🚀 Logout called. Identifiers:', { 
                hasToken: !!token, 
                userId: userId
            });

            await authService.logout({ token, userId });

            // Clear the cookie regardless of whether hit DB or not
            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Lax',
            });

            res.status(200).json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (error) {
            console.error('❌ Logout Exception caught:', error);
            // Even if logout logic fails, we try to clear the cookie for the user
            try {
                res.clearCookie('refreshToken');
            } catch (ignore) {}
            
            next(error);
        }
    }
};

module.exports = authController;
