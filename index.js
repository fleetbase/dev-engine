'use strict';
const { buildEngine } = require('ember-engines/lib/engine-addon');
const { name } = require('./package');
const Funnel = require('broccoli-funnel');

module.exports = buildEngine({
    name,

    postprocessTree(type, tree) {
        if (type === 'css') {
            tree = new Funnel(tree, {
                exclude: ['**/@fleetbase/ember-ui/**/*.css'],
            });
        }

        return tree;
    },

    lazyLoading: {
        enabled: true,
    },

    included(app) {
        this._super.included.apply(this, arguments);

        // Configure ember-prism for the addon
        app.options = app.options || {};
        app.options['ember-prism'] = {
            components: ['json', 'javascript'],
            plugins: ['line-highlight', 'line-numbers'],
        };
    },

    isDevelopingAddon() {
        return true;
    },
});
