const ShippingZone = require('../models/shippingZoneModel');

const shippingZoneService = {
    getAllZones: async () => {
        return await ShippingZone.findAll();
    },

    getZoneDetails: async (zoneId) => {
        const zone = await ShippingZone.findById(zoneId);
        if (!zone) {
            const error = new Error('Shipping zone not found');
            error.statusCode = 404;
            throw error;
        }
        return zone;
    },

    createZone: async (zoneData) => {
        const zoneId = await ShippingZone.create(zoneData);
        return await ShippingZone.findById(zoneId);
    },

    updateZone: async (zoneId, zoneData) => {
        const success = await ShippingZone.update(zoneId, zoneData);
        if (!success) {
            const error = new Error('Update failed or zone not found');
            error.statusCode = 404;
            throw error;
        }
        return await ShippingZone.findById(zoneId);
    },

    deleteZone: async (zoneId) => {
        const success = await ShippingZone.delete(zoneId);
        if (!success) {
            const error = new Error('Delete failed or zone not found');
            error.statusCode = 404;
            throw error;
        }
        return true;
    },

    calculateShipping: async (addressData) => {
        const { state, pincode, subtotal } = addressData;
        
        if (!state || !pincode) {
            const error = new Error('State and Pincode are required for calculation');
            error.statusCode = 400;
            throw error;
        }

        return await ShippingZone.calculateShipping(state, pincode, subtotal || 0);
    }
};

module.exports = shippingZoneService;
