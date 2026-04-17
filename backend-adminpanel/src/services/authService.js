const User = require('../models/userModel');
const RefreshToken = require('../models/refreshTokenModel');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/tokenUtils');

const authService = {
    register: async (userData) => {
        const { name, email, password, role, phone } = userData;

        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            const error = new Error('User already exists');
            error.statusCode = 400;
            throw error;
        }

        const hashedPassword = await hashPassword(password);

        const userId = await User.createUser({
            name,
            email,
            password: hashedPassword,
            role,
            phone
        });

        const tokens = await authService.issueTokens(userId, email, role || 'user');

        const actualRole = role || 'user';
        return {
            user: { 
                user_id: userId, 
                name, 
                email, 
                phone,
                role: actualRole 
            },
            ...tokens
        };
    },

    login: async (email, password) => {
        const user = await User.findByEmail(email);
        if (!user) {
            const error = new Error('Invalid credentials');
            error.statusCode = 401;
            throw error;
        }

        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            const error = new Error('Invalid credentials');
            error.statusCode = 401;
            throw error;
        }

        // STRICT Single Session Check
        const existingSession = await RefreshToken.findByUserId(user.user_id);
        if (existingSession) {
            const now = new Date();
            const expiresAt = new Date(existingSession.expires_at);

            if (now < expiresAt) {
                // Session is still active -> block login
                const error = new Error('User already logged in. Please logout first.');
                error.statusCode = 403;
                error.user_id = user.user_id; // Attach user_id for force logout
                throw error;
            } else {
                // Session is expired -> delete it and allow login
                await RefreshToken.deleteByUserId(user.user_id);
            }
        }

        const tokens = await authService.issueTokens(user.user_id, user.email, user.role);

        return {
            user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            ...tokens
        };
    },

    issueTokens: async (userId, email, role) => {
        const payload = { user_id: userId, email, role };
        
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken({ user_id: userId });

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await RefreshToken.save(userId, refreshToken, expiresAt);

        return { accessToken, refreshToken };
    },

    refresh: async (token) => {
        const savedToken = await RefreshToken.findByToken(token);
        if (!savedToken) {
            const error = new Error('Invalid refresh token');
            error.statusCode = 403;
            throw error;
        }

        const decoded = verifyRefreshToken(token);
        if (!decoded) {
            await RefreshToken.deleteByToken(token);
            const error = new Error('Invalid or expired refresh token');
            error.statusCode = 403;
            throw error;
        }

        const user = await User.findById(decoded.user_id);
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        await RefreshToken.deleteByToken(token);
        
        return await authService.issueTokens(user.user_id, user.email, user.role);
    },

    logout: async (identifiers = {}) => {
        const { token, userId } = identifiers;
        
        // Idempotent logout - handles both token and user_id for flexibility
        if (token) {
            await RefreshToken.deleteByToken(token);
        }
        
        if (userId) {
            await RefreshToken.deleteByUserId(userId);
        }
    }
};

module.exports = authService;
