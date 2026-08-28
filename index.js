'use strict';
const { buildEngine } = require('ember-engines/lib/engine-addon');
const { name } = require('./package');

// The engine's own test suite (`ember test` run from this package) needs the
// engine modules loaded eagerly so the dummy app can resolve them; hosts always
// get the lazy engine. Same pattern as the fleetops engine.
const isRunningOwnTests = process.argv.includes('test') && process.cwd() === __dirname;

module.exports = buildEngine({
    name,

    lazyLoading: {
        enabled: !isRunningOwnTests,
    },

    included(app) {
        this._super.included.apply(this, arguments);

        // Configure ember-prism for the addon; skipped for the eager dummy-app
        // test build, where ember-cli-node-assets registers the component and
        // plugin imports without funneling the files in and the vendor concat fails
        if (!isRunningOwnTests) {
            app.options = app.options || {};
            app.options['ember-prism'] = {
                components: ['json', 'javascript'],
                plugins: ['line-highlight', 'line-numbers'],
            };
        }
    },

    isDevelopingAddon() {
        return true;
    },
});
