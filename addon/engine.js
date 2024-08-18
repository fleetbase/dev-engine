import Engine from '@ember/engine';
import loadInitializers from 'ember-load-initializers';
import Resolver from 'ember-resolver';
import config from './config/environment';
import services from '@fleetbase/ember-core/exports/services';
import WidgetApiMetricsComponent from './components/widget/api-metrics';

const { modulePrefix } = config;
const externalRoutes = ['console', 'extensions'];

export default class DevEngine extends Engine {
    modulePrefix = modulePrefix;
    Resolver = Resolver;
    dependencies = {
        services,
        externalRoutes,
    };
    setupExtension = function (app, engine, universe) {
        // register menu item in header
        universe.registerHeaderMenuItem('Developers', 'console.developers', { icon: 'code', priority: 2 });
        // register metrics widget
        const ApiMetricsWidgetDefinition = {
            widgetId: 'dev-api-metrics-widget',
            name: 'Developer API Metrics',
            description: 'Key metrics from API Usage.',
            icon: 'code',
            component: WidgetApiMetricsComponent,
            grid_options: { w: 12, h: 12, minW: 8, minH: 12 },
            options: {
                title: 'API Metrics',
            },
        };
        universe.registerDashboardWidgets([ApiMetricsWidgetDefinition]);
    };
}

loadInitializers(DevEngine, modulePrefix);
