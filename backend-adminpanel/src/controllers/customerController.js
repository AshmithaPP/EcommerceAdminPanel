const customerService = require('../services/customerService');

const customerController = {
    listCustomers: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await customerService.listCustomers({ ...req.query, page, limit });
            
            res.status(200).json({
                success: true,
                data: result.customers,
                total: result.total,
                page,
                limit
            });
        } catch (error) {
            next(error);
        }
    },

    getCustomerDetails: async (req, res, next) => {
        try {
            const result = await customerService.getCustomerDetails(req.params.user_id);
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    createCustomer: async (req, res, next) => {
        try {
            const result = await customerService.createCustomer(req.body);
            res.status(201).json({
                success: true,
                message: 'Customer created successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    updateCustomer: async (req, res, next) => {
        try {
            await customerService.updateCustomer(req.params.user_id, req.body);
            res.status(200).json({
                success: true,
                message: 'Customer updated successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    addAddress: async (req, res, next) => {
        try {
            const result = await customerService.addAddress(req.params.user_id, req.body);
            res.status(201).json({
                success: true,
                message: 'Address added successfully',
                data: { address_id: result }
            });
        } catch (error) {
            next(error);
        }
    },

    updateAddress: async (req, res, next) => {
        try {
            await customerService.updateAddress(req.params.addressId, req.body);
            res.status(200).json({
                success: true,
                message: 'Address updated successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    deleteAddress: async (req, res, next) => {
        try {
            await customerService.deleteAddress(req.params.addressId);
            res.status(200).json({
                success: true,
                message: 'Address deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = customerController;
