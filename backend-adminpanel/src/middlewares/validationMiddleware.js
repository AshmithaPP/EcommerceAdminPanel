const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            const err = new Error('Validation Error');
            err.statusCode = 400;
            err.validationErrors = errors;
            return next(err);
        }

        req.body = value;
        next();
    };
};

module.exports = { validate };
