const ShippingZone = require('../models/shippingModel');

const shippingController = {
    getAllZones: async (req, res) => {
        try {
            const zones = await ShippingZone.findAll();
            res.json({ success: true, data: zones });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    createZone: async (req, res) => {
        try {
            const id = await ShippingZone.create(req.body);
            res.json({ success: true, message: 'Shipping zone created', id });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    updateZone: async (req, res) => {
        try {
            await ShippingZone.update(req.params.id, req.body);
            res.json({ success: true, message: 'Shipping zone updated' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    deleteZone: async (req, res) => {
        try {
            await ShippingZone.delete(req.params.id);
            res.json({ success: true, message: 'Shipping zone deleted' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    calculateShipping: async (req, res) => {
        const { state, subtotal } = req.query;
        if (!state) {
            return res.status(400).json({ success: false, message: 'State is required' });
        }

        try {
            const result = await ShippingZone.calculateCharge(state, subtotal);
            res.json({ success: true, ...result });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
};

module.exports = shippingController;
