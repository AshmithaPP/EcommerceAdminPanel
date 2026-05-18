const User = require('../models/userModel');
const { hashPassword } = require('../utils/passwordUtils');
const db = require('../config/database');

const adminUserController = {
    createAdmin: async (req, res, next) => {
        try {
            const { name, email, password, role, permissions } = req.body;

            if (!name || !email || !password || !role) {
                return res.status(400).json({ success: false, message: 'All fields are required' });
            }

            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'Admin user with this email already exists' });
            }

            const hashedPassword = await hashPassword(password);
            const permissionsVal = role === 'superadmin' ? null : permissions;

            const userId = await User.createUser({
                name,
                email,
                password: hashedPassword,
                role,
                permissions: permissionsVal
            });

            res.status(201).json({
                success: true,
                message: 'Admin user created successfully',
                data: {
                    user_id: userId,
                    name,
                    email,
                    role,
                    permissions: permissionsVal,
                    status: 1
                }
            });
        } catch (error) {
            next(error);
        }
    },

    listAdmins: async (req, res, next) => {
        try {
            const admins = await User.findAllAdmins();
            res.status(200).json({
                success: true,
                data: admins
            });
        } catch (error) {
            next(error);
        }
    },

    updateAdmin: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { name, email, role, status, permissions, password } = req.body;

            const existingAdmin = await User.findById(id);
            if (!existingAdmin) {
                return res.status(404).json({ success: false, message: 'Admin not found' });
            }

            const updateData = { name, email, role, status, permissions };

            // Optional password update
            if (password && password.trim() !== '') {
                const hashedPassword = await hashPassword(password);
                await db.query('UPDATE users SET password = ? WHERE user_id = ?', [hashedPassword, id]);
            }

            // Super Admin has unrestricted permissions, reset permissions column to null
            if (role === 'superadmin') {
                updateData.permissions = null;
            }

            const updated = await User.updateAdmin(id, updateData);

            res.status(200).json({
                success: true,
                message: 'Admin user updated successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    toggleAdminStatus: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { status } = req.body; // Expected: 0 or 1

            const existingAdmin = await User.findById(id);
            if (!existingAdmin) {
                return res.status(404).json({ success: false, message: 'Admin not found' });
            }

            // Prevent self deactivation
            if (req.user.user_id === id) {
                return res.status(400).json({ success: false, message: 'Cannot deactivate yourself!' });
            }

            await User.updateAdmin(id, { status });

            res.status(200).json({
                success: true,
                message: `Admin user status updated to ${status === 1 ? 'Active' : 'Inactive'}`
            });
        } catch (error) {
            next(error);
        }
    },

    deleteAdmin: async (req, res, next) => {
        try {
            const { id } = req.params;

            const existingAdmin = await User.findById(id);
            if (!existingAdmin) {
                return res.status(404).json({ success: false, message: 'Admin not found' });
            }

            if (req.user.user_id === id) {
                return res.status(400).json({ success: false, message: 'Cannot delete yourself!' });
            }

            await db.query('DELETE FROM users WHERE user_id = ?', [id]);

            res.status(200).json({
                success: true,
                message: 'Admin user deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = adminUserController;
