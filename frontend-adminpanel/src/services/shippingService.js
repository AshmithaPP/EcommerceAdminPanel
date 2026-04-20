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


};

export default shippingService;
