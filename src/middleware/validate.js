const validate = (schema) => {
    return (req, res, next) => {

        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            return res.status(400).json({
                message: "Invalid request data",
                status: "failed",
                errors: error.details.map((detail) => detail.message)
            });
        }

        // Replace request body with validated data
        req.body = value;

        next();
    };
};

module.exports = validate;
