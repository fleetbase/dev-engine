import { Widget, ExtensionComponent } from '@fleetbase/ember-core/contracts';

export default {
    setupExtension(app, universe) {
        const menuService = universe.getService('menu');
        const widgetService = universe.getService('widget');

        // Register in header menu
        menuService.registerHeaderMenuItem('Developers', 'console.developers', {
            icon: 'code',
            priority: 2,
            description: 'API keys, webhooks, socket channels, event logs, and developer tooling.',
            shortcuts: [
                {
                    title: 'API Keys',
                    description: 'Create and manage API keys for authenticating your integrations.',
                    icon: 'key',
                    route: 'console.developers.api-keys',
                },
                {
                    title: 'Webhooks',
                    description: 'Configure webhook endpoints to receive real-time event notifications.',
                    icon: 'webhook',
                    route: 'console.developers.webhooks',
                },
                {
                    title: 'Sockets',
                    description: 'Monitor active WebSocket channels and connected clients.',
                    icon: 'plug',
                    route: 'console.developers.sockets',
                },
                {
                    title: 'Events',
                    description: 'Browse the full history of platform events and payloads.',
                    icon: 'bolt',
                    route: 'console.developers.events',
                },
                {
                    title: 'Logs',
                    description: 'Inspect API request and response logs for debugging.',
                    icon: 'terminal',
                    route: 'console.developers.logs',
                },
            ],
        });

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
