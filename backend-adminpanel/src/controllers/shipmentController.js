const shipmentService = require('../services/shipmentService');

const shipmentController = {
    create: async (req, res, next) => {
        try {
            const { order_id, courier_name, tracking_number } = req.body;
            
            if (!order_id || !courier_name || !tracking_number) {
                const error = new Error('Order ID, courier name, and tracking number are required');
                error.statusCode = 400;
                throw error;
            }

            const shipment = await shipmentService.createShipment({
                order_id,
                courier_name,
                tracking_number
            });

            res.status(201).json({
                success: true,
                message: 'Shipment created successfully',
                data: shipment
            });
        } catch (error) {
            next(error);
        }
    },

    updateStatus: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { status, location, comment } = req.body;

            if (!status) {
                const error = new Error('Status is required');
                error.statusCode = 400;
                throw error;
            }

            const shipment = await shipmentService.updateStatus(id, status, { location, comment });

            res.status(200).json({
                success: true,
                message: `Shipment status updated to ${status}`,
                data: shipment
            });
        } catch (error) {
            next(error);
        }
    },

    getShipment: async (req, res, next) => {
        try {
            const { id } = req.params;
            const shipment = await shipmentService.getShipmentDetails(id);

            res.status(200).json({
                success: true,
                data: shipment
            });
        } catch (error) {
            next(error);
        }
    },

    getAll: async (req, res, next) => {
        try {
            const { search, status, page = 1, limit = 10 } = req.query;
            const offset = (page - 1) * limit;

            const result = await shipmentService.getShipments({ search, status, limit, offset });

            res.status(200).json({
                success: true,
                data: result.shipments,
                pagination: {
                    total: result.total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(result.total / limit)
                }
            });
        } catch (error) {
            next(error);
        }
    },

    getRTO: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { reason, comment } = req.body;

            const shipment = await shipmentService.updateStatus(id, 'RTO', { comment: `RTO Reason: ${reason}. ${comment || ''}` });

            res.status(200).json({
                success: true,
                message: 'RTO status recorded',
                data: shipment
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = shipmentController;
