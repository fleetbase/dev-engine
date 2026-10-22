import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ApplicationController extends Controller {
    @service intl;
    @service abilities;
    @service fetch;

    get navigationItems() {
        return [
            {
                label: this.intl.t('developers.application.sidebar.items.home'),
                description: this.intl.t('developers.application.sidebar.descriptions.home'),
                icon: 'home',
                route: 'console.developers.home',
                keywords: ['dashboard', 'overview', 'metrics'],
            },
            {
                label: this.intl.t('developers.application.sidebar.items.api-keys'),
                description: this.intl.t('developers.application.sidebar.descriptions.api-keys'),
                icon: 'key',
                route: 'console.developers.api-keys',
                permission: 'developers list api-key',
                visible: this.can('developers see api-key'),
                keywords: ['credentials', 'access keys', 'sandbox', 'live keys'],
            },
            {
                label: this.intl.t('developers.application.sidebar.items.webhooks'),
                description: this.intl.t('developers.application.sidebar.descriptions.webhooks'),
                icon: 'globe',
                route: 'console.developers.webhooks',
                permission: 'developers list webhook',
                visible: this.can('developers see webhook'),
                keywords: ['endpoints', 'callbacks', 'deliveries', 'notifications'],
            },
            {
                label: this.intl.t('developers.application.sidebar.items.events'),
                description: this.intl.t('developers.application.sidebar.descriptions.events'),
                icon: 'bolt',
                route: 'console.developers.events',
                permission: 'developers list event',
                visible: this.can('developers see event'),
                keywords: ['event stream', 'activity', 'webhook events'],
            },
            {
                label: this.intl.t('developers.application.sidebar.items.requests'),
                description: this.intl.t('developers.application.sidebar.descriptions.requests'),
                icon: 'terminal',
                route: 'console.developers.logs',
                permission: 'developers list log',
                visible: this.can('developers see log'),
                keywords: ['logs', 'requests', 'traffic', 'debugging'],
            },
            {
                label: this.intl.t('developers.application.sidebar.items.channels'),
                description: this.intl.t('developers.application.sidebar.descriptions.channels'),
                icon: 'tower-broadcast',
                route: 'console.developers.sockets',
                permission: 'developers list socket',
                visible: this.can('developers see socket'),
                keywords: ['sockets', 'websockets', 'channels', 'realtime'],
            },
        ];
    }

    can(permission) {
        try {
            return this.abilities.can(permission);
        } catch (_) {
            return true;
        }
    }

    @action
    async searchNavigation({ query, limit = 12 }) {
        const trimmedQuery = query?.trim();

        if (!trimmedQuery) {
            return [];
        }

        try {
            const response = await this.fetch.get('developers/search', {
                query: trimmedQuery,
                limit,
            });

            return response.results ?? [];
        } catch (_) {
            return [];
        }
    }
}
