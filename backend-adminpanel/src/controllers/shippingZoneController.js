const shippingZoneService = require('../services/shippingZoneService');

const shippingZoneController = {
    getAll: async (req, res, next) => {
        try {
            const zones = await shippingZoneService.getAllZones();
            res.status(200).json({
                success: true,
                data: zones
            });
        } catch (error) {
            next(error);
        }
    },

    getById: async (req, res, next) => {
        try {
            const zone = await shippingZoneService.getZoneDetails(req.params.id);
            res.status(200).json({
                success: true,
                data: zone
            });
        } catch (error) {
            next(error);
        }
    },

    create: async (req, res, next) => {
        try {
            const zone = await shippingZoneService.createZone(req.body);
            res.status(201).json({
                success: true,
                message: 'Shipping zone created successfully',
                data: zone
            });
        } catch (error) {
            next(error);
        }
    },

    update: async (req, res, next) => {
        try {
            const zone = await shippingZoneService.updateZone(req.params.id, req.body);
            res.status(200).json({
                success: true,
                message: 'Shipping zone updated successfully',
                data: zone
            });
        } catch (error) {
            next(error);
        }
    },

    delete: async (req, res, next) => {
        try {
            await shippingZoneService.deleteZone(req.params.id);
            res.status(200).json({
                success: true,
                message: 'Shipping zone deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    calculate: async (req, res, next) => {
        try {
            const result = await shippingZoneService.calculateShipping(req.body);
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = shippingZoneController;
