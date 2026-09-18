import ResourceActionService from '@fleetbase/ember-core/services/resource-action';
import { action } from '@ember/object';
import groupApiEvents from '@fleetbase/ember-core/utils/group-api-events';

/**
 * Webhook endpoint actions shared by the Developers console and other engines (for example Fleetbase AI).
 */
export default class WebhookActionsService extends ResourceActionService {
    constructor() {
        super(...arguments);
        this.initialize('webhook-endpoint', { permissionPrefix: 'developers', mountPrefix: 'console.developers' });
    }

    transition = {
        list: () => this.transitionTo('webhooks.index'),
    };

    modal = {
        create: (...args) => this.createWebhook(...args),
        edit: (...args) => this.editWebhook(...args),
    };

    /**
     * Loads the event, version, and credential options the webhook form needs.
     */
    async loadWebhookOptions() {
        const [webhookEvents, apiVersions, apiCredentials] = await Promise.all([
            this.fetch.get('webhook-endpoints/events'),
            this.fetch.get('webhook-endpoints/versions'),
            this.store.query('api-credential', { limit: -1 }),
        ]);

        return { webhookEvents, groupedApiEvents: groupApiEvents(webhookEvents), apiVersions, apiCredentials };
    }

    /**
     * Opens the dialog to add a webhook endpoint
     *
     * @void
     */
    @action createWebhook() {
        const formPermission = 'developers create webhook';
        const webhook = this.store.createRecord('webhook-endpoint', {
            events: [],
            mode: this.currentUser.getOption('sandbox') ? 'test' : 'live',
        });

        this.editWebhook(webhook, {
            title: this.intl.t('developers.webhooks.index.add-webhook'),
            acceptButtonText: this.intl.t('developers.webhooks.index.add-webhook-button-text'),
            acceptButtonIcon: 'check',
            acceptButtonIconPrefix: 'fas',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            formPermission,
            webhook,
            confirm: async (modal) => {
                modal.startLoading();

                if (this.abilities.cannot(formPermission)) {
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }

                try {
                    await webhook.save();
                    this.notifications.success(this.intl.t('developers.webhooks.index.new-webhook-success-message'));
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Triggers dialog to edit webhook
     *
     * @param {WebhookEndpointModel} webhook
     * @param {Object} options
     * @void
     */
    @action async editWebhook(webhook, options = {}) {
        const { webhookEvents, groupedApiEvents, apiVersions, apiCredentials } = await this.loadWebhookOptions();

        const formPermission = 'developers update webhook';
        this.modalsManager.show('modals/webhook-form', {
            title: this.intl.t('developers.webhooks.index.edit-webhook-endpoint'),
            acceptButtonText: this.intl.t('developers.webhooks.index.edit-webhook-endpoint-button-text'),
            acceptButtonIcon: 'save',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            formPermission,
            declineButtonIcon: 'times',
            declineButtonIconPrefix: 'fas',
            eventOptions: groupedApiEvents,
            versionOptions: apiVersions,
            apiCredentialOptions: apiCredentials,
            webhook,
            setVersion: ({ target }) => {
                webhook.version = target.value || null;
            },
            setApiCredential: ({ target }) => {
                webhook.api_credential_uuid = target.value || null;
            },
            searchEvents: (query) => {
                if (typeof query !== 'string') {
                    return;
                }
                const resources = Object.keys(groupedApiEvents);
                const filteredEvents = {};
                resources.forEach((eventResource) => {
                    filteredEvents[eventResource] = groupedApiEvents[eventResource].filter((event) => {
                        return event.toLowerCase().includes(query.toLowerCase());
                    });
                    // if 0 events remove from filter
                    if (filteredEvents[eventResource].length === 0) {
                        delete filteredEvents[eventResource];
                    }
                });
                this.modalsManager.setOption('eventOptions', filteredEvents);
            },
            addEvent: (event) => {
                if (webhook.events.includes(event)) {
                    return;
                }

                webhook.events.pushObject(event);
            },
            removeEvent: (event) => {
                webhook.events.removeObject(event);
            },
            clearEvents: () => {
                webhook.events.clear();
            },
            receiveAllEvents: () => {
                webhook.events.pushObjects(webhookEvents);
            },
            confirm: async (modal) => {
                modal.startLoading();

                if (this.abilities.cannot(formPermission)) {
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }

                try {
                    await webhook.save();
                    this.notifications.success(this.intl.t('developers.webhooks.index.new-webhook-success-message'));
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
            ...options,
        });
    }

    /**
     * Toggles dialog to delete webhook
     *
     * @param {WebhookEndpointModel} webhook
     * @param {Object} options
     * @void
     */
    @action deleteWebhook(webhook, options = {}) {
        this.modalsManager.confirm({
            title: this.intl.t('developers.webhooks.index.delete-webhook-endpoint'),
            body: this.intl.t('developers.webhooks.index.delete-webhook-endpoint-body'),
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await webhook.destroyRecord();
                    this.notifications.success(this.intl.t('developers.webhooks.index.delete-webhook-success-message'));
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
            ...options,
        });
    }
}
