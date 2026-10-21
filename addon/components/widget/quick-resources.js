import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class WidgetQuickResourcesComponent extends Component {
    @service intl;
    @service hostRouter;
    @service apiKeyActions;
    @service webhookActions;

    get resources() {
        return [
            { label: this.intl.t('developers.dashboard.quick.create-key'), icon: 'key', onClick: () => this.apiKeyActions.createApiKey(), permission: 'developers create api-key' },
            { label: this.intl.t('developers.dashboard.quick.add-endpoint'), icon: 'globe', onClick: () => this.webhookActions.createWebhook(), permission: 'developers create webhook' },
            { label: this.intl.t('developers.application.sidebar.items.events'), icon: 'bolt', route: 'console.developers.events.index' },
            { label: this.intl.t('developers.application.sidebar.items.requests'), icon: 'terminal', route: 'console.developers.logs.index' },
            { label: this.intl.t('developers.application.sidebar.items.channels'), icon: 'tower-broadcast', route: 'console.developers.sockets.index' },
            { label: this.intl.t('developers.dashboard.quick.api-reference'), icon: 'book', url: 'https://docs.fleetbase.io' },
        ];
    }

    @action open(resource) {
        if (typeof resource.onClick === 'function') {
            return resource.onClick();
        }

        if (resource.url) {
            return window.open(resource.url, '_blank', 'noopener');
        }

        return this.hostRouter.transitionTo(resource.route);
    }
}
