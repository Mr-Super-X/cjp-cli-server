'use strict';

// 自建库
const { createCloudBuildTask } = require('../../models/CloudBuildTask');
const { FAILED } = require('../../const');

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

async function prePublish(cloudBuildTask, socket, helper) {
  await execBuildTask(
    cloudBuildTask,
    socket,
    helper,
    'prePublish',
    { action: 'pre-publish', message: '开始启动云发布预检查' },
    { action: 'pre-publish failed', message: '云发布预检查执行失败！' },
    { action: 'pre-publish success', message: '云发布预检查通过' }
  );
}


async function publish(cloudBuildTask, socket, helper) {
  await execBuildTask(
    cloudBuildTask,
    socket,
    helper,
    'publish',
    { action: 'publish', message: '开始启动云发布任务' },
    { action: 'publish failed', message: '云发布任务执行失败！' },
    { action: 'publish success', message: '云发布任务执行成功' }
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
        message: `${failed.message} 失败原因：${result.message}`,
      })
    );
    throw new Error('任务终止');
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
        // 云构建准备
        await prepare(cloudBuildTask, socket, helper);
        // 克隆仓库&下载模板
        await download(cloudBuildTask, socket, helper);
        // 安装依赖
        await install(cloudBuildTask, socket, helper);
        // 云构建
        await build(cloudBuildTask, socket, helper);
        // 准备云发布
        await prePublish(cloudBuildTask, socket, helper);
        // 云发布
        await publish(cloudBuildTask, socket, helper);
        // TODO 生成访问链接，暂未备案成功
        const type = cloudBuildTask.isProd() ? 'cjp-cli' : 'cjp-cli-dev';
        const link = `https://${type}.cjpclidev.top/${cloudBuildTask._name}`;
        // 主动告诉客户端，然后关闭连接
        socket.emit('build', helper.parseMsg('build success', {
          message: `云构建发布成功，访问链接：${link}`,
        }));
        socket.disconnect();
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
