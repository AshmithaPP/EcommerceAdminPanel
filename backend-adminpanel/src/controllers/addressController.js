const Address = require('../models/addressModel');

const addressController = {
    addAddress: async (req, res, next) => {
        try {
            const userId = req.user.user_id;
            const address = await Address.create(userId, req.body);
            res.status(201).json({
                success: true,
                message: 'Address added successfully',
                data: address
            });
        } catch (error) {
            next(error);
        }
    },

    getAddresses: async (req, res, next) => {
        try {
            const userId = req.user.user_id;
            const addresses = await Address.findAllByUserId(userId);
            res.status(200).json({
                success: true,
                addresses
            });
        } catch (error) {
            next(error);
        }
    },

    updateAddress: async (req, res, next) => {
        try {
            const { address_id } = req.params;
            const userId = req.user.user_id;

            // Check ownership
            const existing = await Address.findById(address_id);
            if (!existing || existing.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized access to address'
                });
            }

            const updated = await Address.update(address_id, userId, req.body);
            res.status(200).json({
                success: true,
                message: 'Address updated successfully',
                data: updated
            });
        } catch (error) {
            next(error);
        }
    },

    deleteAddress: async (req, res, next) => {
        try {
            const { address_id } = req.params;
            const userId = req.user.user_id;

            // Check ownership
            const existing = await Address.findById(address_id);
            if (!existing || existing.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized access to address'
                });
            }

            await Address.delete(address_id, userId);
            res.status(200).json({
                success: true,
                message: 'Address deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = addressController;
