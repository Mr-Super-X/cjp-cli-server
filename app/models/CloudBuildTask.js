'use strict';

// 第三方库
const fse = require('fs-extra'); // 用于文件操作
const Git = require('simple-git'); // 用于git操作
const cSpawn = require('cross-spawn'); // 用来解决node内置的spawn在windows上运行路径解析错误问题
const { glob } = require('glob'); // 用于shell模式匹配文件
// 内置库
const fs = require('fs');
const os = require('os');
const path = require('path');
// 自建库
const OSS = require('./OSS');
const config = require('../../config/db');
const helper = require('../extend/helper');
const { SUCCESS, FAILED, COMMAND_WHITELIST } = require('../const');

const DEFAULT_CLI_HOME = '.cjp-cli-dev'; // 默认缓存路径
const CLOUD_BUILD_DIR = 'cloudbuild'; // 默认缓存路径
const TAOBAO_REGISTRY = 'https://registry.npmmirror.com/'; // 淘宝源

const REDIS_PREFIX = 'cloudbuild';

class CloudBuildTask {
  constructor(options, ctx, app) {
    const { name, version, repo, branch, buildCmd, prod, registry } = options;

    this._repo = repo; // 仓库地址
    this._name = name; // 项目名称
    this._version = version; // 项目版本号
    this._branch = branch; // 开发分支
    this._buildCmd = buildCmd; // 构建命令
    this._buildPath = null; // 构建结果路径
    // 定义缓存目录
    this._dir = path.resolve(
      os.homedir(),
      DEFAULT_CLI_HOME,
      CLOUD_BUILD_DIR,
      `${this._name}@${this._version}`
    );
    // 定义缓存源码目录
    this._sourceCodeDir = path.resolve(this._dir, this._name);
    this._git = null; // git实例
    this._oss = null; // OSS上传对象
    this._prod = prod === 'true'; // 这个prod传到服务端会被转成string，这里要再处理一次
    this._registry = registry || TAOBAO_REGISTRY; // 使用用户指定的npm源或者淘宝镜像

    this._ctx = ctx;
    this._app = app;
    const { logger, socket } = ctx;
    this._socket = socket;
    this._logger = logger;
    this._logger.info('_dir', this._dir);
    this._logger.info('_sourceCodeDir', this._sourceCodeDir);
    this._logger.info('_buildCmd', this._buildCmd);
    this._logger.info('_prod', this._prod);
  }

  async prepare() {
    // 保障缓存目录存在（不存在会自动创建）
    fse.ensureDirSync(this._dir);
    // 每次执行前应该先清空缓存目录
    fse.emptyDirSync(this._dir);
    // 实例化git并缓存到this中
    this._git = new Git(this._dir);

    if (this._prod) {
      this._oss = new OSS(config.OSS_PROD_BUCKET);
    } else {
      this._oss = new OSS(config.OSS_DEV_BUCKET);
    }

    // 返回成功数据结构
    return this.success('云构建准备阶段执行成功');
  }

  // 下载git仓库源码
  async download() {
    // 克隆项目
    await this._git.clone(this._repo);
    // 克隆项目后这个目录就已经创建好了，此时需要生成新的git实例来对克隆的源码目录进行操作
    this._git = new Git(this._sourceCodeDir);
    // 切换到开发分支并同步远程分支代码
    await this._git.checkout([ '-b', this._branch, `origin/${this._branch}` ]);

    // 判断目录是否存在，存在返回成功数据结构，否则返回失败结构
    return fs.existsSync(this._sourceCodeDir)
      ? this.success('云下载git仓库成功')
      : this.failed('云下载git仓库失败');
  }

  async install() {
    // 安装依赖
    const res = await this.execCommand(
      `npm install --registry=${this._registry}`
    );

    return res
      ? this.success('云安装项目依赖成功')
      : this.failed('云安装项目依赖失败');
  }

  async build() {
    let res = true;
    // 检查执行命令
    if (checkCommand(this._buildCmd)) {
      res = await this.execCommand(this._buildCmd);
    } else {
      res = false;
    }

    return res ? this.success('云构建成功') : this.failed('云构建失败');
  }

  async prePublish() {
    // 1. 获取构建结果
    const buildPath = this.findBuildPath();
    // 2. 检查构建结果
    if (!buildPath) {
      return this.failed('未找到构建结果输出路径，请检查');
    }

    this._buildPath = buildPath;
    return this.success(`已找到构建结果输出路径${buildPath}`);
  }

  async publish() {
    let res = true;
    const files = await glob('**', {
      cwd: this._buildPath,
      nodir: true, // 排除空文件夹
      ignore: '**/node_modules/**', // 忽略所有的node_modules
    });

    if (!files || files.length === 0) {
      this._logger.error(this._buildPath + '中没有匹配到任何文件');
      return;
    }

    await Promise.all(
      files.map(async file => {
        const filePath = path.resolve(this._buildPath, file);
        try {
          // 构建代码上传oss
          await this._oss.put(`${this._name}/${file}`, filePath);

          res = true;
        } catch (err) {
          res = false;
          this._logger.error(`阿里云OSS上传 ${filePath} 出错: ${err.message}`);
        }
      })
    ).catch(() => {
      res = false;
    });

    return res ? this.success('云发布成功') : this.failed('云发布失败');
  }

  findBuildPath() {
    // 去当前源码目录下找'dist', 'build'进行合并
    const buildDir = [ 'dist', 'build' ];
    const buildPath = buildDir.find(dir =>
      fs.existsSync(path.resolve(this._sourceCodeDir, dir))
    );

    this._logger.info('buildPath', buildPath);

    if (buildPath) {
      return path.resolve(this._sourceCodeDir, buildPath);
    }

    return null;
  }

  execCommand(command) {
    // npm install => ['npm', 'install']
    const commands = command.split(' ');
    if (commands.length === 0) return null;

    const firstCommand = commands[0]; // 首个命令
    const surplusCommand = commands.slice(1) || []; // 剩余命令

    console.log(firstCommand, surplusCommand);
    return new Promise(resolve => {
      const p = exec(
        firstCommand,
        surplusCommand,
        {
          cwd: this._sourceCodeDir, // 设置当前上下文为源码路径
        },
        {
          stdio: 'pipe', // 透传执行日志
        }
      );
      p.on('error', e => {
        this._logger.error('build error: ' + e);
        resolve(false);
      });
      p.on('exit', c => {
        this._logger.info('build exit: ' + c);
        resolve(true);
      });
      // 对所有的日志进行监控
      p.stdout.on('data', data => {
        // 将build过程中的日志输出给客户端
        this._socket.emit('building', data.toString());
      });
      p.stderr.on('data', data => {
        this._socket.emit('building', data.toString());
      });
    });
  }

  success(message, data) {
    return this.response(SUCCESS, message, data);
  }

  failed(message, data) {
    return this.response(FAILED, message, data);
  }

  response(code, message, data) {
    return {
      code,
      message,
      data,
    };
  }

  // 清除缓存文件
  async clean() {
    if (fs.existsSync(this._dir)) {
      fse.removeSync(this._dir);
    }

    // 获取redis任务
    const { socket } = this._ctx;
    const client = socket.id;
    const redisKey = `${REDIS_PREFIX}:${client}`;

    this._logger.info('开始删除redis缓存：' + await this._app.redis.get(redisKey));
    // 删除redis缓存
    await this._app.redis.del(redisKey);
    this._logger.info('redis缓存删除成功：' + await this._app.redis.get(redisKey));
  }

  // 判断是否生产环境
  isProd() {
    return this._prod;
  }
}

function exec(command, args, options) {
  return cSpawn(command, args, options || {});
}

function checkCommand(command) {
  if (command) {
    const commands = command.split(' ');
    if (commands.length === 0 || !COMMAND_WHITELIST.includes(commands[0])) {
      return false;
    }

    return true;
  }

  return false;
}

// 导出创建云构建任务方法
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
  const { repo, name, version, branch, buildCmd, prod } = task;

  return new CloudBuildTask(
    {
      repo,
      name,
      version,
      branch,
      buildCmd,
      prod,
    },
    ctx,
    app
  );
}

module.exports = {
  CloudBuildTask,
  createCloudBuildTask,
};
