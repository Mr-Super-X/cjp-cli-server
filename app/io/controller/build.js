'use strict';

// 自建库
const helper = require('../../extend/helper');
const CloudBuildTask = require('../../models/CloudBuildTask');
const { SUCCESS, FAILED } = require('../../const');

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
      type: 'create task',
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
  socket.emit('build', helper.parseMsg('prepare', {
    type: 'prepare',
    message: '开始执行构建前的准备工作',
  }));
  // 获取准备结果，如果准备失败发出事件告诉客户端
  const prepareRes = await cloudBuildTask.prepare();
  if (!prepareRes || prepareRes.code === FAILED) {
    socket.emit('build', helper.parseMsg('prepare failed', {
      type: 'prepare failed',
      message: '构建前的准备工作执行失败！',
    }));
    return;
  }

  // 成功也需要提示客户端
  socket.emit('build', helper.parseMsg('prepare success', {
    type: 'prepare success',
    message: '构建前的准备工作执行成功',
  }));
}

async function download(cloudBuildTask, socket, helper) {
  socket.emit('build', helper.parseMsg('download repository', {
    type: 'download repository',
    message: '开始下载远程仓库源码',
  }));
  // 获取下载结果，如果失败发出事件告诉客户端
  const downloadRes = await cloudBuildTask.download();
  if (!downloadRes || downloadRes.code === FAILED) {
    socket.emit('build', helper.parseMsg('download failed', {
      type: 'download failed',
      message: '远程仓库源码下载失败！',
    }));
    return;
  }

  // 成功也需要提示客户端
  socket.emit('build', helper.parseMsg('download success', {
    type: 'download success',
    message: '远程仓库源码下载成功',
  }));
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
      } catch (error) {
        socket.emit(
          'build',
          helper.parseMsg('error', {
            type: 'error',
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
