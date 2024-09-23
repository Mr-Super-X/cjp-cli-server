'use strict';

const Controller = require('egg').Controller;
const { STATUS } = require('../../const');
const ComponentService = require('../../service/ComponentService');
const VersionService = require('../../service/VersionService');
const { success, failed } = require('../../utils/request');
class ComponentsController extends Controller {
  // 调用get('/api/v1/components')会自动打到这个方法
  async index() {
    const { ctx } = this;
    ctx.body = 'get components';
  }

  // 调用get('/api/v1/components/123')会自动打到这个方法
  async show() {
    const { ctx } = this;
    ctx.body = 'show single components';
  }

  // 调用post('/api/v1/components')会自动打到这个方法
  async create() {
    const { ctx, app } = this;
    const { component, git } = ctx.request.body;
    const timestamp = new Date().getTime();
    const {
      projectName,
      componentDescription,
      npmName,
      projectVersion,
      buildPath,
      examplePath,
      exampleList,
      exampleRealPath,
    } = component;
    const { type, remote, owner, login, version } = git;

    const componentData = {
      name: projectName,
      description: componentDescription,
      npm_name: npmName,
      npm_version: projectVersion,
      git_type: type,
      git_remote: remote,
      git_owner: owner,
      git_login: login,
      status: STATUS.ON,
      create_dt: timestamp,
      create_by: login,
      update_dt: timestamp,
      update_by: login,
    };

    // console.log(componentData);
    const componentService = new ComponentService(app);
    // 1. 添加组件信息
    // 查询数据库中是否存在component
    const haveComponentInDB = await componentService.queryOne({
      projectName: componentData.name,
    });
    let componentId;
    // 如果组件数据不存在则插入一条数据
    if (!haveComponentInDB) {
      componentId = await componentService.insert(componentData);
    } else {
      componentId = haveComponentInDB.id;
    }
    if (!componentId) {
      ctx.body = failed('添加组件到数据库失败');
      return;
    }
    // 2. 添加组件多版本信息
    const versionData = {
      component_id: componentId,
      version,
      build_path: buildPath,
      example_path: examplePath,
      example_list: JSON.stringify(exampleList),
      example_real_path: exampleRealPath,
      status: STATUS.ON,
      create_dt: timestamp,
      create_by: login,
      update_dt: timestamp,
      update_by: login,
    };
    const versionService = new VersionService(app);
    const haveVersionInDB = await versionService.queryOne({
      component_id: componentId,
      version,
    });
    if (!haveVersionInDB) {
      const versionRes = await versionService.insert(versionData);
      if (!versionRes) {
        ctx.body = failed('添加组件版本到数据库失败');
        return;
      }
    } else {
      const updateData = {
        build_path: buildPath,
        example_path: examplePath,
        example_list: JSON.stringify(exampleList),
        example_real_path: exampleRealPath,
        update_dt: timestamp,
        update_by: login,
      };

      const versionRes = await versionService.update(updateData, {
        // 确定要更新的数据是哪一条
        component_id: componentId, // 主键id
        version, // 主键版本
      });

      if (!versionRes) {
        ctx.body = failed('更新组件版本到数据库失败');
        return;
      }
    }
    ctx.body = success('添加组件到数据库成功', componentData);
  }
}

module.exports = ComponentsController;
