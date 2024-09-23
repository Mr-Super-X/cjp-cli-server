'use strict';

class ComponentService {
  constructor(app) {
    this.app = app;
    this.name = 'component_test'; // 数据表名称
  }

  async queryOne(query) {
    const data = await this.app.mysql.select(this.name, {
      where: query,
    });
    if (data && data.length > 0) {
      return data[0];
    }

    return null;
  }

  // 插入数据库
  async insert(data) {
    const res = this.app.mysql.insert(this.name, data);
    return res.insertId;
  }
}

module.exports = ComponentService;
