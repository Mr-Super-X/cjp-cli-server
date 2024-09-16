'use strict';

// 自建库
const helper = require('../../extend/helper');
const CloudBuildTask = require('../../models/CloudBuildTask');
const { FAILED } = require('../../const');

const REDIS_PREFIX = 'cloudbuild';

async function createCloudBuildTask(ctx, app) {
  const { socket } = ctx;
  const client = socket.id;
  // 获取redis任务
  const redisKey = `${REDIS_PREFIX}:${client}`;
  const redisTask = await app.redis.get(redisKey);
  const task = JSON.parse(redisTask);
  // 向客户端发送build事件
  socket.emit(
    'build',
    helper.parseMsg('create task', {
      message: '创建云构建任务成功',
    })
  );
  // 返回云构建任务实例
  const { repo, name, version, branch, buildCmd } = task;
  return new CloudBuildTask(
    {
      repo,
      name,
      version,
      branch,
      buildCmd,
    },
    ctx,
    app
  );
}

async function prepare(cloudBuildTask, socket, helper) {
  await execBuildTask(
    cloudBuildTask,
    socket,
    helper,
    'prepare',
    { action: 'prepare', message: '开始执行构建前的准备工作' },
    { action: 'prepare failed', message: '构建前的准备工作执行失败！' },
    { action: 'prepare success', message: '构建前的准备工作执行成功' }
  );
}

async function download(cloudBuildTask, socket, helper) {
  await execBuildTask(
    cloudBuildTask,
    socket,
    helper,
    'download',
    { action: 'download repository', message: '开始云下载git仓库源码' },
    { action: 'download failed', message: 'git仓库源码云下载失败！' },
    { action: 'download success', message: 'git仓库源码云下载成功' }
  );
}

async function install(cloudBuildTask, socket, helper) {
  await execBuildTask(
    cloudBuildTask,
    socket,
    helper,
    'install',
    { action: 'install', message: '开始云安装项目依赖' },
    { action: 'install failed', message: '项目依赖云安装失败！' },
    { action: 'install success', message: '项目依赖云安装成功' }
  );
}

async function build(cloudBuildTask, socket, helper) {
  await execBuildTask(
    cloudBuildTask,
    socket,
    helper,
    'build',
    { action: 'build', message: '开始启动云构建任务' },
    { action: 'build failed', message: '云构建任务执行失败！' },
    { action: 'build success', message: '云构建任务执行成功' }
  );
}

// 定义参数公共结构
const helperAction = {
  action: '',
  message: '',
};
/**
 * 公共的云构建执行方法
 * @param {*} cloudBuildTask 云构建任务实例
 * @param {*} socket socket
 * @param {*} helper 统一的返回数据封装
 * @param {*} cloudBuildTaskFnName 云构建任务方法名
 * @param {*} start emit出去的开始事件
 * @param {*} failed emit出去的报错事件
 * @param {*} success emit出去的成功事件
 * @return
 */
async function execBuildTask(
  cloudBuildTask,
  socket,
  helper,
  cloudBuildTaskFnName,
  start = { ...helperAction },
  failed = { ...helperAction },
  success = { ...helperAction }
) {
  socket.emit(
    'build',
    helper.parseMsg(start.action, {
      message: start.message,
    })
  );
  // 获取结果，如果失败发出事件告诉客户端
  const result = await cloudBuildTask[cloudBuildTaskFnName]();
  if (!result || result.code === FAILED) {
    socket.emit(
      'build',
      helper.parseMsg(failed.action, {
        message: failed.message,
      })
    );
    return;
  }

  // 成功也需要提示客户端
  socket.emit(
    'build',
    helper.parseMsg(success.action, {
      message: success.message,
    })
  );
}

module.exports = app => {
  class Controller extends app.Controller {
    async index() {
      const { ctx, app } = this;
      const { socket, helper } = ctx;
      const cloudBuildTask = await createCloudBuildTask(ctx, app);
      try {
        await prepare(cloudBuildTask, socket, helper);
        await download(cloudBuildTask, socket, helper);
        await install(cloudBuildTask, socket, helper);
        await build(cloudBuildTask, socket, helper);
      } catch (error) {
        socket.emit(
          'build',
          helper.parseMsg('build failed', {
            message: '云构建任务失败，失败原因：' + error.message,
          })
        );
        // 主动断开连接
        socket.disconnect();
      }
    }
  }
  return Controller;
};
