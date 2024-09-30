'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

/* mongodb 配置信息 */
// const MONGODB_URL = 'mongodb://cjp:123456@cjp.clidev.xyz:27017';
const MONGODB_URL = 'mongodb://cjp.clidev.xyz:27017';
const MONGODB_NAME = 'cjp-cli-dev';

/* OSS配置信息 */
const OSS_ACCESS_KEY_ID = 'LTAI5tPPfQgYcdtgKwv2cNTn';
// 将重要数据存在本地缓存文件中，保障安全性
const OSS_ACCESS_KEY_SECRET = fs.readFileSync(path.resolve(os.homedir(), '.cjp-cli-dev', 'oss_access_secret_key')).toString();
const OSS_PROD_BUCKET = 'cjp-cli';
const OSS_DEV_BUCKET = 'cjp-cli-dev';
const OSS_REGION = 'oss-cn-guangzhou';

/* MySQL配置信息 */
const MYSQL_HOST = 'localhost';
const MYSQL_PORT = 3306;
const MYSQL_USER = 'cjp';
// 将重要数据存在本地缓存文件中，保障安全性
const MYSQL_PWD = fs.readFileSync(path.resolve(os.homedir(), '.cjp-cli-dev', 'mysql_password')).toString();
const MYSQL_DB = 'cjp-cli-dev';

module.exports = {
  MONGODB_URL,
  MONGODB_NAME,
  OSS_ACCESS_KEY_ID,
  OSS_ACCESS_KEY_SECRET,
  OSS_PROD_BUCKET,
  OSS_DEV_BUCKET,
  OSS_REGION,
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PWD,
  MYSQL_DB,
};
