'use strict';

const MongoDB = require('@pick-star/cli-mongodb');
const { MONGODB_URL, MONGODB_NAME } = require('../../config/db');

function mongo() {
  return new MongoDB(MONGODB_URL, MONGODB_NAME);
}

module.exports = mongo;
