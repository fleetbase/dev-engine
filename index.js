'use strict';
const { buildEngine } = require('ember-engines/lib/engine-addon');
const { name } = require('./package');

module.exports = buildEngine({
  name,
  lazyLoading: {
    enabled: true,
  },
  _concatStyles: () => {},
  isDevelopingAddon() {
    return true;
  },
});
