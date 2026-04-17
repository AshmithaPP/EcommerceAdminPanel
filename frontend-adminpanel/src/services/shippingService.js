import { privateApi } from './api';

const shippingService = {
    // Shipment APIs
    getShipments: async (params) => {
        const response = await privateApi.get('/shipments', { params });
        return response.data;
    },

    getShipmentById: async (id) => {
        const response = await privateApi.get(`/shipments/${id}`);
        return response.data.data;
    },

    updateShipmentStatus: async (id, statusData) => {
        const response = await privateApi.patch(`/shipments/${id}/status`, statusData);
        return response.data;
    },

    recordRTO: async (id, rtoData) => {
        const response = await privateApi.post(`/shipments/${id}/rto`, rtoData);
        return response.data;
    },

    createShipment: async (shipmentData) => {
        const response = await privateApi.post('/shipments', shipmentData);
        return response.data;
    },

    // Shipping Zone APIs
    getAllZones: async () => {
        const response = await privateApi.get('/shipping-zones');
        return response.data;
    },

    createZone: async (zoneData) => {
        const response = await privateApi.post('/shipping-zones', zoneData);
        return response.data;
    },

    updateZone: async (id, zoneData) => {
        const response = await privateApi.put(`/shipping-zones/${id}`, zoneData);
        return response.data;
    },

    deleteZone: async (id) => {
        const response = await privateApi.delete(`/shipping-zones/${id}`);
        return response.data;
    },

    calculateShipping: async (data) => {
        const response = await privateApi.post('/shipping-zones/calculate', data);
        return response.data;
    }
};

export default shippingService;
