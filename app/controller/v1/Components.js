'use strict';

const Controller = require('egg').Controller;
const { STATUS } = require('../../const');

class ComponentsController extends Controller {
  async index() {
    const { ctx } = this;
    ctx.body = 'get components';
  }

  async show() {
    const { ctx } = this;
    ctx.body = 'show single components';
  }

  async create() {
    const { ctx, app } = this;
    const { component, git } = ctx.request.body;
    const timestamp = new Date().getTime();
    const { projectName, componentDescription, npmName, projectVersion } =
      component;
    const { type, remote, owner, login } = git;

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

    console.log(componentData);
    ctx.body = componentData;
  }
}

module.exports = ComponentsController;
