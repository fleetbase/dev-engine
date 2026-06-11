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
                    icon: 'globe',
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

        // Register dashboard and widgets
        const widgets = [
            new Widget({
                id: 'developers-kpi-api-requests',
                name: 'API Requests',
                description: 'Total API requests for the current period.',
                icon: 'code',
                component: new ExtensionComponent('@fleetbase/dev-engine', 'widget/kpi-api-requests'),
                grid_options: { w: 3, h: 4, minW: 3, minH: 4 },
                category: 'KPI Tiles',
                default: true,
            }),
            new Widget({
                id: 'developers-kpi-api-error-rate',
                name: 'API Error Rate',
                description: 'Percentage of API requests returning an error.',
                icon: 'triangle-exclamation',
                component: new ExtensionComponent('@fleetbase/dev-engine', 'widget/kpi-api-error-rate'),
                grid_options: { w: 3, h: 4, minW: 3, minH: 4 },
                category: 'KPI Tiles',
                default: true,
            }),
            new Widget({
                id: 'developers-kpi-api-latency',
                name: 'Avg API Latency',
                description: 'Average API response duration for the current period.',
                icon: 'gauge-high',
                component: new ExtensionComponent('@fleetbase/dev-engine', 'widget/kpi-api-latency'),
                grid_options: { w: 3, h: 4, minW: 3, minH: 4 },
                category: 'KPI Tiles',
                default: true,
            }),
            new Widget({
                id: 'developers-kpi-webhook-success',
                name: 'Webhook Success Rate',
                description: 'Percentage of webhook deliveries returning a 2xx response.',
                icon: 'webhook',
                component: new ExtensionComponent('@fleetbase/dev-engine', 'widget/kpi-webhook-success'),
                grid_options: { w: 3, h: 4, minW: 3, minH: 4 },
                category: 'KPI Tiles',
                default: true,
            }),
            new Widget({
                id: 'developers-kpi-active-api-keys',
                name: 'Active API Keys',
                description: 'Active API credentials in this organization.',
                icon: 'key',
                component: new ExtensionComponent('@fleetbase/dev-engine', 'widget/kpi-active-api-keys'),
                grid_options: { w: 3, h: 4, minW: 3, minH: 4 },
                category: 'KPI Tiles',
                default: true,
            }),
            new Widget({
                id: 'developers-kpi-active-webhooks',
                name: 'Active Webhooks',
                description: 'Enabled webhook endpoints in this organization.',
                icon: 'plug-circle-check',
                component: new ExtensionComponent('@fleetbase/dev-engine', 'widget/kpi-active-webhooks'),
                grid_options: { w: 3, h: 4, minW: 3, minH: 4 },
                category: 'KPI Tiles',
                default: true,
            }),
            new Widget({
                id: 'developers-kpi-webhook-failures',
                name: 'Webhook Failures',
                description: 'Failed webhook deliveries for the current period.',
                icon: 'webhook',
                component: new ExtensionComponent('@fleetbase/dev-engine', 'widget/kpi-webhook-failures'),
                grid_options: { w: 3, h: 4, minW: 3, minH: 4 },
                category: 'KPI Tiles',
                default: true,
            }),
            new Widget({
                id: 'developers-kpi-events-emitted',
                name: 'Events Emitted',
                description: 'Platform events emitted in the current period.',
                icon: 'bolt',
                component: new ExtensionComponent('@fleetbase/dev-engine', 'widget/kpi-events-emitted'),
                grid_options: { w: 3, h: 4, minW: 3, minH: 4 },
                category: 'KPI Tiles',
                default: true,
            }),
            new Widget({
                id: 'developers-api-traffic',
                name: 'API Traffic',
                description: 'API request volume, successes, and errors over time.',
                icon: 'chart-line',
                component: new ExtensionComponent('@fleetbase/dev-engine', 'widget/api-traffic'),
                grid_options: { w: 6, h: 8, minW: 5, minH: 7 },
                category: 'Analytics',
                default: true,
            }),
            new Widget({
                id: 'developers-webhook-delivery',
                name: 'Webhook Delivery Health',
                description: 'Webhook delivery volume, success, failure, and retry health.',
                icon: 'chart-column',
                component: new ExtensionComponent('@fleetbase/dev-engine', 'widget/webhook-delivery'),
                grid_options: { w: 6, h: 8, minW: 5, minH: 7 },
                category: 'Analytics',
                default: true,
            }),
            new Widget({
                id: 'developers-endpoint-health',
                name: 'Endpoint Health',
                description: 'Webhook endpoint delivery health and recent failures.',
                icon: 'heart-pulse',
                component: new ExtensionComponent('@fleetbase/dev-engine', 'widget/endpoint-health'),
                grid_options: { w: 6, h: 8, minW: 5, minH: 7 },
                category: 'Operations',
                default: true,
            }),
            new Widget({
                id: 'developers-event-stream',
                name: 'Event Stream',
                description: 'Top event types and event sources in the selected period.',
                icon: 'bolt',
                component: new ExtensionComponent('@fleetbase/dev-engine', 'widget/event-stream'),
                grid_options: { w: 6, h: 8, minW: 5, minH: 7 },
                category: 'Operations',
                default: true,
            }),
            new Widget({
                id: 'developers-activity',
                name: 'Developer Activity',
                description: 'Recent API requests, webhook deliveries, and events.',
                icon: 'timeline',
                component: new ExtensionComponent('@fleetbase/dev-engine', 'widget/developer-activity'),
                grid_options: { w: 6, h: 8, minW: 5, minH: 7 },
                category: 'Operations',
                default: true,
            }),
            new Widget({
                id: 'developers-quick-resources',
                name: 'Quick Resources',
                description: 'Shortcuts into API keys, webhooks, logs, events, and sockets.',
                icon: 'link',
                component: new ExtensionComponent('@fleetbase/dev-engine', 'widget/quick-resources'),
                grid_options: { w: 6, h: 8, minW: 5, minH: 7 },
                category: 'Resources',
                default: true,
            }),
            new Widget({
                id: 'dev-api-metrics-widget',
                name: 'Developer API Metrics (Legacy)',
                description: 'Legacy grouped monitoring widget. Replaced by individual developer dashboard widgets.',
                icon: 'code',
                component: new ExtensionComponent('@fleetbase/dev-engine', 'widget/api-metrics'),
                grid_options: { w: 12, h: 12, minW: 8, minH: 12 },
                options: { title: 'API Metrics' },
                category: 'Legacy',
                default: false,
            }),
        ];

        const getWidgetById = (id = null, mutate = null) => {
            if (!id) return null;
            const widget = widgets.find((w) => w.id === id);
            const clone = new Widget(widget.toObject());
            if (typeof mutate === 'function') {
                mutate(clone);
            }
            return clone;
        };

        widgetService.registerDashboard('developers');
        widgetService.registerWidgets('developers', widgets);
        // widgetService.registerWidgets('dashboard', [
        //     getWidgetById('developers-kpi-api-error-rate'),
        //     getWidgetById('developers-kpi-api-latency'),
        //     getWidgetById('developers-kpi-webhook-success'),
        //     getWidgetById('developers-api-traffic', (widget) => {
        //         widget.withGridOptions({ w: 6, h: 7, minW: 5, minH: 6 });
        //     }),
        // ]);
    },
};
