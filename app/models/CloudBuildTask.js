'use strict';

// 第三方库
const fse = require('fs-extra'); // 用于文件操作
const Git = require('simple-git'); // 用于git操作
// 内置库
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
// 自建库
const { SUCCESS, FAILED } = require('../const');

const DEFAULT_CLI_HOME = '.cjp-cli-dev'; // 默认缓存路径
const CLOUD_BUILD_DIR = 'cloudbuild'; // 默认缓存路径
const TAOBAO_REGISTRY = 'https://registry.npmmirror.com/'; // 淘宝源

// 白名单命令，不在此白名单中的命令都需要确认是否执行，防止用户插入风险操作，如：rm -rf等
const COMMAND_WHITELIST = [
  'npm', // Node.js的包管理工具
  'cnpm', // npm的中国镜像加速版
  'yarn', // 另一个流行的JavaScript包管理工具
  'pnpm', // 性能更优的npm替代品
  'node', // Node.js运行环境
];

class CloudBuildTask {
  constructor(options, ctx) {
    const { name, version, repo, branch, buildCmd } = options;

    this._repo = repo; // 仓库地址
    this._name = name; // 项目名称
    this._version = version; // 项目版本号
    this._branch = branch; // 开发分支
    this._buildCmd = buildCmd; // 构建命令
    // 定义缓存目录
    this._dir = path.resolve(
      os.homedir(),
      DEFAULT_CLI_HOME,
      CLOUD_BUILD_DIR,
      `${this._name}@${this._version}`
    );
    // 定义缓存源码目录
    this._sourceCodeDir = path.resolve(this._dir, this._name);

    const { logger, socket } = ctx;
    this._socket = socket;
    this._logger = logger;
    this._logger.info('_dir', this._dir);
    this._logger.info('_sourceCodeDir', this._sourceCodeDir);
  }

  async prepare() {
    // 保障缓存目录存在（不存在会自动创建）
    fse.ensureDirSync(this._dir);
    // 每次执行前应该先清空缓存目录
    fse.emptyDirSync(this._dir);
    // 实例化git并缓存到this中
    this._git = new Git(this._dir);

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
      `npm install --registry=${TAOBAO_REGISTRY}`
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
}

function exec(command, args, options) {
  const win32 = process.platform === 'win32';

  const cmd = win32 ? 'cmd' : command;
  const cmdArgs = win32 ? [ '/c' ].concat(command, args) : args;
  return cp.spawn(cmd, cmdArgs, options || {});
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

module.exports = CloudBuildTask;
