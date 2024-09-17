const { Controller } = require('egg');
const mongo = require('../utils/mongo');
const OSS = require('../models/OSS');
const config = require('../../config/db');
const { failed, success } = require('../utils/request');

class ProjectController extends Controller {
  // 获取项目/组件代码模板
  async getTemplate() {
    const { ctx } = this;
    const data = await mongo().query('project');
    ctx.body = data;
  }

  // 获取oss项目数据
  async getOSSProject() {
    const { ctx } = this;
    let ossProjectType = ctx.query.type;
    const ossProjectName = ctx.query.name;
    if (!ossProjectName) {
      ctx.body = failed('项目名称不存在');
      return;
    }
    if (!ossProjectType) {
      ossProjectType = 'prod';
    }

    let oss;
    if (ossProjectType === 'prod') {
      oss = new OSS(config.OSS_PROD_BUCKET);
    } else {
      oss = new OSS(config.OSS_DEV_BUCKET);
    }

    if (oss) {
      const fileList = await oss.list(ossProjectName);
      ctx.body = success('获取OSS项目数据成功', fileList);
    } else {
      ctx.body = failed('获取OSS项目数据失败');
    }
  }

  // 获取redis数据
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
