'use strict';
const { Controller } = require('egg');
const mongo = require('../utils/mongo');
const { failed, success } = require('../utils/request');

class SectionController extends Controller {
  async getTemplate() {
    const { ctx } = this;
    try {
      const data = await mongo().query('section');
      ctx.body = success('获取代码片段模板成功', data);
    } catch (error) {
      ctx.body = failed(`获取代码片段模板失败：${error}`, null);
    }
  }
}

module.exports = SectionController;
