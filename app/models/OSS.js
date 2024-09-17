'use strict';

const oss = require('ali-oss');

const config = require('../../config/db');

class OSS {
  constructor(bucket) {
    this._oss = oss({
      accessKeyId: config.OSS_ACCESS_KEY_ID,
      accessKeySecret: config.OSS_ACCESS_KEY_SECRET,
      region: config.OSS_REGION,
      bucket,
    });
  }
}

module.exports = OSS;
