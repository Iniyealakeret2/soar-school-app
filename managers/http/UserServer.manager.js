const http              = require('http');
const express           = require('express');
const cors              = require('cors');
const app               = express();
const swaggerUi         = require('swagger-ui-express');
const swaggerSpec       = require('../../config/swagger');

module.exports = class UserServer {
    constructor({config, managers}){
        this.config        = config;
        this.userApi       = managers.userApi;
        this.app           = app;
    }
    
    /** for injecting middlewares */
    use(args){
        app.use(args);
    }

    /** server configs */
    run(){
        app.use(cors({origin: '*'}));
        app.use(express.json());
        app.use(express.urlencoded({ extended: true}));
        app.use('/static', express.static('public'));
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

        /** an error handler */
        app.use((err, req, res, next) => {
            if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
                return res.status(400).send({ ok: false, message: 'Malformed JSON: Please check your double quotes and syntax.' });
            }
            console.error(err.stack)
            res.status(500).send('Something broke!')
        });
        
        /** a single middleware to handle all */
        app.all('/api/:moduleName/:fnName', this.userApi.mw);

        let server = http.createServer(app);
        server.listen(this.config.dotEnv.USER_PORT, () => {
            console.log(`${(this.config.dotEnv.SERVICE_NAME).toUpperCase()} is running on port: ${this.config.dotEnv.USER_PORT}`);
            console.log(`📑 Swagger Documentation: http://localhost:${this.config.dotEnv.USER_PORT}/api-docs`);
        });
    }
}