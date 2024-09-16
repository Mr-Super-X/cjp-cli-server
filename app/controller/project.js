const { Controller } = require('egg');
const mongo = require('../utils/mongo');

class ProjectController extends Controller {
  // 获取项目/组件代码模板
  async getTemplate() {
    const { ctx } = this;
    const data = await mongo().query('project');
    ctx.body = data;
  }

  async getRedis() {
    const { ctx, app } = this;
    const { key } = ctx.query;
    if (key) {
      const value = await app.redis.get(key);
      ctx.body = `redis[${key}] = ${value}`;
    } else {
      ctx.body = '请提供key';
    }
  }
}

module.exports = ProjectController;
