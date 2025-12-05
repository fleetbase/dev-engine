import { Widget, ExtensionComponent } from '@fleetbase/ember-core/contracts';

export default {
    setupExtension(app, universe) {
        const menuService = universe.getService('menu');
        const widgetService = universe.getService('widget');

        // Register in header menu
        menuService.registerHeaderMenuItem('Developers', 'console.developers', { icon: 'code', priority: 2 });

        // Register widgets
        const widgets = [
            new Widget({
                id: 'dev-api-metrics-widget',
                name: 'Developer API Metrics',
                description: 'Key metrics from API Usage.',
                icon: 'code',
                component: new ExtensionComponent('@fleetbase/dev-engine', 'widget/api-metrics'),
                grid_options: { w: 12, h: 12, minW: 8, minH: 12 },
                options: { title: 'API Metrics' },
            }),
        ];

        widgetService.registerWidgets('dashboard', widgets);
    },
};
