/* eslint valid-jsdoc: "off" */

// 本地服务
const REDIS_PORT = 6379;
const REDIS_HOST = '127.0.0.1';
const REDIS_PWD = '';

// 阿里云服务
// const REDIS_PORT = 6379;
// const REDIS_HOST = 'r-bp1xiivvt8l1op4to2.redis.rds.aliyuncs.com';
// const REDIS_PWD = 'cjp_test:Abc@123456';

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = (exports = {});

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1725269481756_2782';

  // add your middleware config here
  config.middleware = [];

  // add websocket server config here
  config.io = {
    namespace: {
      '/': {
        connectionMiddleware: [ 'auth' ],
        packetMiddleware: [ 'filter' ],
      },
    },
  };

  config.redis = {
    client: {
      port: REDIS_PORT,
      host: REDIS_HOST,
      password: REDIS_PWD,
      db: 0,
    },
  };

  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
  };

  return {
    ...config,
    ...userConfig,
  };
};
