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

  async put(object, localPath, options = {}) {
    return await this._oss.put(object, localPath, options);
  }

  async list(prefix) {
    const ossFiles = await this._oss.list({
      prefix,
    });
    if (ossFiles && ossFiles.objects) {
      return ossFiles.objects;
    }
    return [];
  }
}

module.exports = OSS;
