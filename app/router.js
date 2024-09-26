/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  // 获取项目模板接口
  router.get('/project/template', controller.project.getTemplate);
  // 获取oss项目接口
  router.get('/project/oss', controller.project.getOSSProject);
  // 获取oss文件接口
  router.get('/oss/get', controller.project.getOSSFile);
  // 获取redis数据接口
  router.get('/redis/test', controller.project.getRedis);
  // 获取页面模板接口
  router.get('/page/template', controller.page.getTemplate);
  // 获取代码片段模板接口
  router.get('/section/template', controller.section.getTemplate);

  // restful API
  // 组件库数据增删改查
  router.resources('components', '/api/v1/components', controller.v1.components);

  app.io.route('build', app.io.controller.build.index);
};
