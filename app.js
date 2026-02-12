const config                = require('./config/index.config.js');
const Cortex                = require('ion-cortex');
const ManagersLoader        = require('./loaders/ManagersLoader.js');
const Aeon                  = require('aeon-machine');
const Oyster                = require('oyster-db');

const mongoDB = config.dotEnv.MONGO_URI? require('./connect/mongo')({
    uri: config.dotEnv.MONGO_URI
}):null;

console.log("🚀 MongoDB Connection Initiated");

const cache = require('./cache/cache.dbh')({
    prefix: config.dotEnv.CACHE_PREFIX ,
    url: config.dotEnv.CACHE_REDIS
});

const oyster = new Oyster({ 
    url: config.dotEnv.OYSTER_REDIS, 
	prefix: config.dotEnv.OYSTER_PREFIX 
});

const cortex = new Cortex({
    prefix: config.dotEnv.CORTEX_PREFIX,
    url: config.dotEnv.CORTEX_REDIS,
    type: config.dotEnv.CORTEX_TYPE,
    state: ()=>{
        return {} 
    },
    activeDelay: "50ms",
    idlDelay: "200ms",
});

const aeon = new Aeon({ cortex , timestampFrom: Date.now(), segmantDuration: 500 });

const managersLoader = new ManagersLoader({config, cache, cortex, oyster, aeon});
const managers = managersLoader.load();

managers.userServer.run();
