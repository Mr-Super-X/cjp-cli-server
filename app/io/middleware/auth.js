'use strict';

module.exports = () => {
  return async (ctx, next) => {
    // 正在连接的内容在next前面
    const { socket, logger, helper } = ctx;
    const { id } = socket;
    const query = socket.handshake.query;
    try {
      logger.info('query: ', query);
      // 服务端发送这个id时需要加延时时间，否则客户端监听不到这个id，原因是服务端发送id时，客户端监听事件还没有准备好
      setTimeout(() => {
        socket.emit(
          id,
          helper.parseMsg('connect', {
            type: 'connect',
            message: '云构建服务连接成功',
          })
        );
      }, 300);
      await next();
      // 断开连接的内容在next后面
      console.log('disconnect!');
    } catch (error) {
      logger.error('build error', error.message);
    }
  };
};
