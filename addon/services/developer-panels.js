import Service, { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { maskKey } from '../utils/format';

/**
 * Opens Developers records in the shared right-hand context panel (the
 * drawer) so a list keeps its filters and scroll position. Every panel offers
 * "Open full page", which transitions to the existing view route for deep links.
 */
export default class DeveloperPanelsService extends Service {
    @service resourceContextPanel;
    @service hostRouter;
    @service intl;

    /**
     * Opens a panel with the engine's defaults.
     *
     * @param {Object} definition a resource-context-panel definition
     * @returns {String} the overlay id
     */
    @action open(definition) {
        return this.resourceContextPanel.open({
            size: 'md',
            closeOnTransition: true,
            dismissible: true,
            panelContentClass: 'dev-panel-content',
            headerClass: 'dev-panel-header',
            bodyClass: 'dev-panel-body',
            ...definition,
        });
    }

    /**
     * Closes the active panel.
     */
    @action close(id) {
        return this.resourceContextPanel.close(id);
    }

    /**
     * API key detail drawer.
     */
    @action openApiKey(apiKey, options = {}) {
        return this.open({
            resource: apiKey,
            title: apiKey.name ?? maskKey(apiKey.key),
            header: 'api-key/drawer-header',
            width: '640px',
            dismissible: false,
            tabWrapperClass: 'dev-drawer-tabs',
            tabStyle: 'github',
            tabSize: 'sm',
            tabs: [
                { key: 'overview', label: this.intl.t('developers.common.overview'), component: 'api-key/tabs/overview' },
                { key: 'requests', label: this.intl.t('developers.application.sidebar.items.requests'), component: 'api-key/tabs/requests' },
                { key: 'webhooks', label: this.intl.t('developers.application.sidebar.items.webhooks'), component: 'api-key/tabs/webhooks' },
                { key: 'channel', label: this.intl.t('developers.api-keys.drawer.channel'), component: 'api-key/tabs/channel' },
                { key: 'activity', label: this.intl.t('developers.activity.title'), component: 'api-key/tabs/activity' },
            ],
            registry: 'developers:api-key:details',
            ...options,
        });
    }

    /**
     * Event detail drawer.
     */
    @action openEvent(event, options = {}) {
        return this.open({
            resource: event,
            title: event.event ?? event.public_id,
            content: 'api-event/panel',
            registry: 'developers:event:details',
            ...options,
        });
    }

    /**
     * Request log detail drawer.
     */
    @action openRequest(log, options = {}) {
        return this.open({
            resource: log,
            title: `${log.method ?? ''} ${log.path ?? log.public_id ?? ''}`.trim(),
            content: 'api-request-log/panel',
            registry: 'developers:log:details',
            size: 'lg',
            ...options,
        });
    }

    /**
     * Webhook delivery attempt inspector drawer.
     */
    @action openAttempt(attempt, options = {}) {
        return this.open({
            resource: attempt,
            title: this.intl.t('developers.component.webhook.attempt-panel.title', { attempt: attempt.attempt ?? 1 }),
            content: 'webhook/attempt-panel',
            size: 'lg',
            ...options,
        });
    }

    /**
     * Transitions to the full page for a record and closes the panels.
     */
    @action openFullPage(routeName, record) {
        this.resourceContextPanel.closeAll();

        return this.hostRouter.transitionTo(`console.developers.${routeName}`, record);
    }
}
