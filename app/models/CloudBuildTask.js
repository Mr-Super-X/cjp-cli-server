'use strict';

// 第三方库
const fse = require('fs-extra'); // 用于文件操作
const Git = require('simple-git'); // 用于git操作
// 内置库
const fs = require('fs');
const os = require('os');
const path = require('path');
// 自建库
const { SUCCESS, FAILED } = require('../const');

const DEFAULT_CLI_HOME = '.cjp-cli-dev'; // 默认缓存路径
const CLOUD_BUILD_DIR = 'cloudbuild'; // 默认缓存路径

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

    const { logger } = ctx;
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
    return this.success();
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
    return fs.existsSync(this._sourceCodeDir) ? this.success() : this.failed(`找不到路径：${this._sourceCodeDir}`);
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

module.exports = CloudBuildTask;
