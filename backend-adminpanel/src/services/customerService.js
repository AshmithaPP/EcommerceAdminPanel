const Customer = require('../models/customerModel');
const Address = require('../models/addressModel');
const { hashPassword } = require('../utils/passwordUtils');
const db = require('../config/database');

const customerService = {
    listCustomers: async (queryParams) => {
        const { search, status, page = 1, limit = 10 } = queryParams;
        const offset = (page - 1) * limit;
        return await Customer.findAll({ search, status, limit, offset });
    },

    getCustomerDetails: async (id) => {
        const customer = await Customer.findById(id);
        if (!customer) {
            const error = new Error('Customer not found');
            error.statusCode = 404;
            throw error;
        }

        const addresses = await Address.findByUserId(id);

        // Fetch Stats
        const [statsRows] = await db.query(
            `SELECT 
                COUNT(*) as purchases_count, 
                IFNULL(SUM(total_amount), 0) as total_spent,
                'A+' as score,
                '7.2%' as return_rate
             FROM orders WHERE user_id = ?`,
            [id]
        );

        // Fetch Recent Orders
        const [orders] = await db.query(
            `SELECT order_id, order_number, total_amount as total, status, created_at as date 
             FROM orders 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT 10`,
            [id]
        );

        return { 
            ...customer, 
            addresses, 
            stats: statsRows[0],
            recent_orders: orders 
        };
    },

    createCustomer: async (customerData) => {
        const {
            name, email, phone, password,
            // nested address object or array
            addresses,
            // top-level address fields
            address_line1, address_line2,
            city, state,
            zip_code, postal_code,   // accept both spellings
            country, is_default
        } = customerData;

        // --- Duplicate checks (friendly errors before we open a transaction) ---
        if (email) {
            const [emailRows] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
            if (emailRows.length > 0) {
                const error = new Error('Email address already registered');
                error.statusCode = 400;
                throw error;
            }
        }

        const existingPhone = await Customer.findByPhone(phone);
        if (existingPhone) {
            const error = new Error('Phone number already registered');
            error.statusCode = 400;
            throw error;
        }

        // --- Build address list (supports nested OR top-level fields) ---
        let addressList = [];

        if (addresses) {
            const raw = Array.isArray(addresses) ? addresses : [addresses];
            addressList = raw.map(addr => {
                if (typeof addr === 'string') {
                    return { address_line1: addr, is_default: true };
                }
                // normalise postal_code → zip_code
                const { postal_code: pc, ...rest } = addr;
                return { zip_code: pc, ...rest };
            });
        } else if (address_line1) {
            // Address fields sent at the top level of the request body
            addressList = [{
                address_line1,
                address_line2: address_line2 || null,
                city,
                state,
                zip_code: zip_code || postal_code || null,
                country: country || 'India',
                is_default: is_default !== undefined ? is_default : true
            }];
        }

        // --- Transaction: insert user + address(es) atomically ---
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const hashedPassword = await hashPassword(password || 'Customer@123');
            const { v4: uuidv4 } = require('uuid');
            const userId = uuidv4();

            await connection.query(
                `INSERT INTO users (user_id, name, email, phone, password, role, status) VALUES (?, ?, ?, ?, ?, 'user', 1)`,
                [userId, name, email, phone, hashedPassword]
            );

            for (const addr of addressList) {
                const addressId = uuidv4();
                // Unset other defaults if needed
                if (addr.is_default) {
                    await connection.query(
                        'UPDATE customer_addresses SET is_default = FALSE WHERE user_id = ?',
                        [userId]
                    );
                }
                await connection.query(
                    `INSERT INTO customer_addresses
                        (address_id, user_id, address_line1, address_line2, city, state, zip_code, country, is_default)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        addressId, userId,
                        addr.address_line1 || null,
                        addr.address_line2 || null,
                        addr.city || null,
                        addr.state || null,
                        addr.zip_code || null,
                        addr.country || 'India',
                        addr.is_default ? 1 : 0
                    ]
                );
            }

            await connection.commit();
            return { user_id: userId };
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    updateCustomer: async (userId, updateData) => {
        const customer = await Customer.findById(userId);
        if (!customer) {
            const error = new Error('Customer not found');
            error.statusCode = 404;
            throw error;
        }

        // Separate user fields from address fields
        const {
            address_line1, address_line2,
            city, state,
            zip_code, postal_code,
            country, is_default,
            addresses,
            ...userFields
        } = updateData;

        // Update user record (name, email, phone, status, password)
        await Customer.update(userId, userFields);

        // Build address data from top-level fields or nested object
        let addressData = null;

        if (addresses) {
            // Nested: take the first address object
            const addr = Array.isArray(addresses) ? addresses[0] : addresses;
            if (typeof addr === 'object') {
                const { postal_code: pc, ...rest } = addr;
                addressData = { zip_code: pc, ...rest };
            }
        } else if (address_line1) {
            // Top-level address fields
            addressData = {
                address_line1,
                address_line2: address_line2 || null,
                city: city || null,
                state: state || null,
                zip_code: zip_code || postal_code || null,
                country: country || 'India',
                is_default: is_default !== undefined ? is_default : true
            };
        }

        // Upsert address: update default if exists, otherwise create
        if (addressData) {
            const existingAddresses = await Address.findByUserId(userId);
            const defaultAddress = existingAddresses.find(a => a.is_default);

            if (defaultAddress) {
                await Address.update(defaultAddress.address_id, addressData);
            } else {
                await Address.create({ ...addressData, user_id: userId });
            }
        }

        return true;
    },

    addAddress: async (userId, addressData) => {
        const customer = await Customer.findById(userId);
        if (!customer) {
            const error = new Error('Customer not found');
            error.statusCode = 404;
            throw error;
        }
        // Normalize postal_code → zip_code
        const { postal_code, ...rest } = addressData;
        const normalized = { ...rest, user_id: userId };
        if (postal_code && !normalized.zip_code) {
            normalized.zip_code = postal_code;
        }
        return await Address.create(normalized);
    },

    updateAddress: async (addressId, addressData) => {
        const address = await Address.findById(addressId);
        if (!address) {
            const error = new Error('Address not found');
            error.statusCode = 404;
            throw error;
        }
        // Normalize postal_code → zip_code
        const { postal_code, ...rest } = addressData;
        const normalized = { ...rest };
        if (postal_code && !normalized.zip_code) {
            normalized.zip_code = postal_code;
        }
        return await Address.update(addressId, normalized);
    },

    deleteAddress: async (addressId) => {
        return await Address.delete(addressId);
    }
};

module.exports = customerService;
