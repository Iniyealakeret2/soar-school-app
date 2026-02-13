const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');

// Set environment variables
process.env.ADMIN_SIGNUP_KEY = 'soar_secure_key';
process.env.LONG_TOKEN_SECRET = 'test_long_secret';
process.env.SHORT_TOKEN_SECRET = 'test_short_secret';
process.env.NACL_SECRET = 'test_nacl_secret';
process.env.ENV = 'development';

const config = require('../../config/index.config.js');
const ManagersLoader = require('../../loaders/ManagersLoader.js');
const Cortex = require('ion-cortex');
const Aeon = require('aeon-machine');
const Oyster = require('oyster-db');

// Force update config.dotEnv in case it was loaded elsewhere with different env
config.dotEnv.ADMIN_SIGNUP_KEY = 'soar_secure_key';
config.dotEnv.LONG_TOKEN_SECRET = 'test_long_secret';
config.dotEnv.SHORT_TOKEN_SECRET = 'test_short_secret';

let mongoServer;

const setupTestEnv = async () => {
    if (!mongoServer) {
        mongoServer = await MongoMemoryServer.create();
    }
    const uri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    await mongoose.connect(uri);

    const mockCache = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        hashGet: jest.fn(),
        hashSet: jest.fn(),
    };

    const mockOyster = {
        on: jest.fn(),
        emit: jest.fn(),
        call: jest.fn().mockImplementation(() => ({})),
    };

    const mockCortex = {
        sub: jest.fn(),
        pub: jest.fn(),
    };

    const mockAeon = {};

    const app = express();
    app.use(express.json());

    const managersLoader = new ManagersLoader({ 
        config, 
        cache: mockCache, 
        cortex: mockCortex, 
        oyster: mockOyster, 
        aeon: mockAeon 
    });

    const managers = managersLoader.load();
    
    // OVERRIDE Rate Limit Middlewares
    const bypassMiddleware = ({next}) => { next(); };
    if (managers.userApi.mwsRepo) {
        managers.userApi.mwsRepo['__rateLimit'] = bypassMiddleware;
        managers.userApi.mwsRepo['__securityLimit'] = bypassMiddleware;
    }
    
    app.all('/api/:moduleName/:fnName', managers.userApi.mw);
    
    return { app, managers, mongoose };
};

const teardownTestEnv = async () => {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
        mongoServer = null;
    }
};

const cleanDatabase = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany();
    }
};

module.exports = {
    setupTestEnv,
    teardownTestEnv,
    cleanDatabase
};
