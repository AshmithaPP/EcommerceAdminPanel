const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Shipment = {
    create: async (shipmentData, connection) => {
        const { order_id, courier_name, tracking_number } = shipmentData;
        const shipmentId = uuidv4();
        
        const sql = `
            INSERT INTO shipments (shipment_id, order_id, courier_name, tracking_number, status)
            VALUES (?, ?, ?, ?, 'Packed')
        `;
        const executor = connection || db;
        await executor.query(sql, [shipmentId, order_id, courier_name, tracking_number]);

        // Log initial status
        await Shipment.addStatusLog({
            shipment_id: shipmentId,
            status: 'Packed',
            comment: 'Shipment created and packed.'
        }, executor);

        return shipmentId;
    },

    addStatusLog: async (logData, connection) => {
        const { shipment_id, status, location, comment } = logData;
        const historyId = uuidv4();
        
        const sql = `
            INSERT INTO shipment_status_history (history_id, shipment_id, status, location, comment)
            VALUES (?, ?, ?, ?, ?)
        `;
        const executor = connection || db;
        await executor.query(sql, [historyId, shipment_id, status, location || null, comment || null]);
        return historyId;
    },

    updateStatus: async (shipmentId, status, { location, comment }, connection) => {
        const executor = connection || db;
        
        let updateSql = `UPDATE shipments SET status = ?, updated_at = NOW()`;
        const params = [status];

        if (status === 'Shipped') {
            updateSql += `, shipped_at = NOW()`;
        } else if (status === 'Delivered') {
            updateSql += `, delivered_at = NOW()`;
        }

        updateSql += ` WHERE shipment_id = ?`;
        params.push(shipmentId);

        await executor.query(updateSql, params);

        // Add to history
        await Shipment.addStatusLog({
            shipment_id: shipmentId,
            status,
            location,
            comment
        }, executor);

        return true;
    },

    findById: async (shipmentId) => {
        const shipmentSql = `
            SELECT s.*, o.order_number, o.status as order_status
            FROM shipments s
            JOIN orders o ON s.order_id = o.order_id
            WHERE s.shipment_id = ?
        `;
        const [rows] = await db.query(shipmentSql, [shipmentId]);
        const shipment = rows[0];

        if (!shipment) return null;

        // Fetch Timeline
        const historySql = `
            SELECT * FROM shipment_status_history 
            WHERE shipment_id = ? 
            ORDER BY created_at DESC
        `;
        const [history] = await db.query(historySql, [shipmentId]);
        shipment.timeline = history;

        return shipment;
    },

    findAll: async ({ search, status, limit = 10, offset = 0 }) => {
        let sql = `
            SELECT s.*, o.order_number 
            FROM shipments s
            JOIN orders o ON s.order_id = o.order_id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            sql += ` AND (s.tracking_number LIKE ? OR o.order_number LIKE ?)`;
            const pattern = `%${search}%`;
            params.push(pattern, pattern);
        }

        if (status) {
            sql += ` AND s.status = ?`;
            params.push(status);
        }

        sql += ` ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await db.query(sql, params);

        // Count for pagination
        let countSql = `
            SELECT COUNT(*) as total 
            FROM shipments s
            JOIN orders o ON s.order_id = o.order_id
            WHERE 1=1
        `;
        const countParams = [];
        if (search) {
            countSql += ` AND (s.tracking_number LIKE ? OR o.order_number LIKE ?)`;
            countParams.push(`%${search}%`, `%${search}%`);
        }
        if (status) {
            countSql += ` AND s.status = ?`;
            countParams.push(status);
        }

        const [[{ total }]] = await db.query(countSql, countParams);

        return { shipments: rows, total };
    },

    findByOrderId: async (orderId) => {
        const sql = `SELECT * FROM shipments WHERE order_id = ? ORDER BY created_at DESC`;
        const [rows] = await db.query(sql, [orderId]);
        return rows;
    }
};

module.exports = Shipment;
