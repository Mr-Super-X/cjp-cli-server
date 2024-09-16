'use strict';

module.exports = app => {
  class Controller extends app.Controller {
    async index() {
      console.log('build');
    }
  }
  return Controller;
};
