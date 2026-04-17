const isDev = process.env.NODE_ENV !== 'production';

/**
 * Map MySQL / known error codes to friendly user-facing messages.
 */
const getMysqlFriendlyMessage = (err) => {
    switch (err.code) {
        case 'ER_NO_SUCH_TABLE':        return 'Database table not found';
        case 'ER_BAD_FIELD_ERROR':      return 'Database query failed — unknown column';
        case 'ER_DUP_ENTRY':            return 'Duplicate entry — record already exists';
        case 'ER_ROW_IS_REFERENCED_2':  return 'Cannot delete — record is referenced by another table';
        case 'ER_NO_REFERENCED_ROW_2':  return 'Referenced record does not exist';
        case 'ECONNREFUSED':            return 'Database connection refused';
        default:                        return null;
    }
};

/**
 * Extract a short, safe hint from the raw error message (first clause only).
 * e.g. "Unknown column 'status' in 'where clause'" → "Unknown column 'status'"
 */
const getShortHint = (message = '') => {
    // Strip everything after " in '" to avoid leaking schema context in semi-prod
    return message.split(" in '")[0].trim();
};

const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;

    // Always log internally
    console.error(`[${new Date().toISOString()}] ❌ ${req.method} ${req.originalUrl} → ${err.message}`);
    if (isDev) console.error(err.stack);

    // Build response
    const friendlyMessage = getMysqlFriendlyMessage(err) || err.message || 'Internal Server Error';

    const response = {
        success: false,
        message: friendlyMessage,
    };

    if (isDev) {
        // In dev: expose a short DB-level hint + full stack for debugging
        response.error = getShortHint(err.message);
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
};

module.exports = errorHandler;
