import Component from '@glimmer/component';

export default class WidgetQuickResourcesComponent extends Component {
    resources = [
        { label: 'API Keys', route: 'api-keys.index', icon: 'key' },
        { label: 'Webhooks', route: 'webhooks.index', icon: 'globe' },
        { label: 'Logs', route: 'logs.index', icon: 'terminal' },
        { label: 'Events', route: 'events.index', icon: 'bolt' },
        { label: 'Sockets', route: 'sockets.index', icon: 'plug' },
    ];
}
