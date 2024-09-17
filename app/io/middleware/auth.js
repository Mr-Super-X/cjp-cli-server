'use strict';

const { createCloudBuildTask } = require('../../models/CloudBuildTask');
const REDIS_PREFIX = 'cloudbuild';

module.exports = () => {
  return async (ctx, next) => {
    // 正在连接的内容在next前面
    const { app, socket, logger, helper } = ctx;
    const { id } = socket;
    const { redis } = app;
    const query = socket.handshake.query;
    try {
      // 服务端发送这个id时需要加延时时间，否则客户端监听不到这个id，原因是服务端发送id时，客户端监听事件还没有准备好
      setTimeout(() => {
        socket.emit(
          id,
          helper.parseMsg('connect', {
            message: '云构建服务连接成功',
          })
        );
      }, 100);

      // 查看redis任务是否存在，不存在则写入redis
      // 任务写入redis的好处是未来想要服务重启的时候，可以清空redis队列去把之前没有执行完的任务继续执行，很方便
      let hasRedisTask = await redis.get(`${REDIS_PREFIX}:${id}`);
      if (!hasRedisTask) {
        await redis.set(`${REDIS_PREFIX}:${id}`, JSON.stringify(query));
      }
      hasRedisTask = await redis.get(`${REDIS_PREFIX}:${id}`);
      logger.info('redisTask: ', hasRedisTask);
      await next();
      // 清除缓存文件
      const cloudBuildTask = await createCloudBuildTask(ctx, app);
      await cloudBuildTask.clean();
      // 断开连接的内容在next后面
      console.log('disconnect!');
    } catch (error) {
      logger.error('build error', error.message);
      // 清除缓存文件
      const cloudBuildTask = await createCloudBuildTask(ctx, app);
      await cloudBuildTask.clean();
    }
  };
};
