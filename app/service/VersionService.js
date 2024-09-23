'use strict';

class VersionService {
  constructor(app) {
    this.app = app;
    this.name = 'version_test'; // 数据表名称
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

  async insert(data) {
    const res = await this.app.mysql.insert(this.name, data);
    if (res.affectedRows > 0) {
      return true;
    }
    return false;
  }

  async update(data, query) {
    // 找到要更新的表、传入数据、查询条件
    const res = await this.app.mysql.update(this.name, data, {
      where: query,
    });
    if (res.affectedRows > 0) {
      return true;
    }
    return false;
  }
}

module.exports = VersionService;
