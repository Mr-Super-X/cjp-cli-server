'use strict';

// 约束前后端规范参数格式
module.exports = {
  parseMsg(action, payload = {}, metadata = {}) {
    const meta = Object.assign(
      {},
      {
        timestamp: Date.now(),
      },
      metadata
    );

    return {
      meta,
      data: {
        action,
        payload,
      },
    };
  },
};
