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

  config.security = {
    csrf: {
      enable: false, // 关闭csrf
    },
  };

  // config.mysql = {
  //   // 单数据库信息配置
  //   client: {
  //     // host
  //     host: '172.16.32.33',
  //     // 端口号
  //     port: '33060',
  //     // 用户名
  //     user: 'dgd-uadp',
  //     // 密码
  //     password: 'dgd-uadp@2020',
  //     // 数据库名
  //     database: 'cjp-cli-dev',
  //   },
  //   // 是否加载到 app 上，默认开启
  //   app: true,
  //   // 是否加载到 agent 上，默认关闭
  //   agent: false,
  // };

  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
  };

  return {
    ...config,
    ...userConfig,
  };
};
