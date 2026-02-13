const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./index.config');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Soar School Management API',
            version: '1.0.0',
            description: 'API documentation for the Soar School Management System',
        },
        servers: [
            {
                url: config.dotEnv.BASE_URL,
                description: process.env.RENDER_EXTERNAL_URL ? 'Production server' : 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: ['./docs/swagger/*.yml', './managers/entities/**/*.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

module.exports = specs;
