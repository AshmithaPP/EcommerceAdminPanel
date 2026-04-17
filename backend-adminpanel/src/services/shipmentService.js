const Shipment = require('../models/shipmentModel');
const Order = require('../models/orderModel');
const db = require('../config/database');

const shipmentService = {
    createShipment: async (shipmentData) => {
        const { order_id } = shipmentData;
        
        const order = await Order.findById(order_id);
        if (!order) {
            const error = new Error('Order not found');
            error.statusCode = 404;
            throw error;
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const shipmentId = await Shipment.create(shipmentData, connection);
            
            // Update Order status to Packed
            await Order.updateStatus(order_id, 'Packed', 'Order has been packed and tracking assigned.', connection);

            await connection.commit();
            return await Shipment.findById(shipmentId);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    updateStatus: async (shipmentId, status, updateData) => {
        const shipment = await Shipment.findById(shipmentId);
        if (!shipment) {
            const error = new Error('Shipment not found');
            error.statusCode = 404;
            throw error;
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            await Shipment.updateStatus(shipmentId, status, updateData, connection);

            // Sync with Order Status
            // Logic: Shipments usually drive the order status once packed
            let orderStatus = null;
            if (status === 'Shipped') orderStatus = 'Shipped';
            if (status === 'Out for Delivery') orderStatus = 'Out for Delivery';
            if (status === 'Delivered') orderStatus = 'Delivered';
            if (status === 'RTO') orderStatus = 'Returned';

            if (orderStatus) {
                await Order.updateStatus(shipment.order_id, orderStatus, updateData.comment || `Shipment status updated to ${status}`, connection);
            }

            await connection.commit();
            return await Shipment.findById(shipmentId);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    getShipmentDetails: async (shipmentId) => {
        const shipment = await Shipment.findById(shipmentId);
        if (!shipment) {
            const error = new Error('Shipment not found');
            error.statusCode = 404;
            throw error;
        }
        return shipment;
    },

    getShipments: async (filters) => {
        return await Shipment.findAll(filters);
    },

    getShipmentsByOrder: async (orderId) => {
        return await Shipment.findByOrderId(orderId);
    }
};

module.exports = shipmentService;
