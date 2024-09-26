'use strict';
const { Controller } = require('egg');
const mongo = require('../utils/mongo');
const { failed, success } = require('../utils/request');

class PageController extends Controller {
  async getTemplate() {
    const { ctx } = this;
    try {
      const data = await mongo().query('page');
      ctx.body = success('获取页面模板成功', data);
    } catch (error) {
      ctx.body = failed(`获取页面模板失败：${error}`, null);
    }
  }
}

module.exports = PageController;
