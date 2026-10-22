import ResourceActionService from '@fleetbase/ember-core/services/resource-action';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import groupApiEvents from '@fleetbase/ember-core/utils/group-api-events';
import { shortUrl } from '../utils/format';

const PRIVATE_HOSTS = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|\[::1\])/i;

/**
 * Webhook endpoint actions shared by the Developers console and other engines (for example Fleetbase AI).
 */
export default class WebhookActionsService extends ResourceActionService {
    constructor() {
        super(...arguments);
        this.initialize('webhook-endpoint', { permissionPrefix: 'developers', mountPrefix: 'console.developers', registryResource: 'webhook' });
    }

    transition = {
        list: () => this.transitionTo('webhooks.index'),
        view: (webhook) => this.viewWebhook(webhook),
    };

    modal = {
        create: (...args) => this.createWebhook(...args),
        edit: (...args) => this.editWebhook(...args),
        delete: (...args) => this.deleteWebhook(...args),
        enable: (...args) => this.enableWebhook(...args),
        disable: (...args) => this.disableWebhook(...args),
    };

    /**
     * Loads the event, version, and credential options the webhook form needs.
     */
    async loadWebhookOptions() {
        const [webhookEvents, apiVersions] = await Promise.all([this.fetch.get('webhook-endpoints/events'), this.fetch.get('webhook-endpoints/versions')]);

        return { webhookEvents, groupedApiEvents: groupApiEvents(webhookEvents), apiVersions };
    }

    /**
     * Mirrors the backend `PublicWebhookUrl` rule so the user learns before submitting.
     *
     * @returns {String|null} an error message, or null when valid
     */
    validateUrl(value) {
        if (isBlank(value)) {
            return this.intl.t('developers.webhooks.form.url-required');
        }

        let url;

        try {
            url = new URL(value);
        } catch {
            return this.intl.t('developers.webhooks.form.url-invalid');
        }

        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
            return this.intl.t('developers.webhooks.form.url-invalid');
        }

        if (PRIVATE_HOSTS.test(url.hostname) || !url.hostname.includes('.')) {
            return this.intl.t('developers.webhooks.form.url-private');
        }

        return null;
    }

    @action viewWebhook(webhook) {
        return this.hostRouter.transitionTo('console.developers.webhooks.view', webhook);
    }

    /**
     * Opens the dialog to add a webhook endpoint
     *
     * @void
     */
    @action createWebhook(options = {}) {
        const formPermission = 'developers create webhook';
        const webhook = this.store.createRecord('webhook-endpoint', {
            events: [],
            mode: this.currentUser.getOption('sandbox') ? 'test' : 'live',
        });

        return this.editWebhook(webhook, {
            title: this.intl.t('developers.webhooks.index.add-webhook'),
            acceptButtonText: this.intl.t('developers.webhooks.form.create-accept'),
            acceptButtonIcon: 'check',
            acceptButtonIconPrefix: 'fas',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            successMessage: this.intl.t('developers.webhooks.index.new-webhook-success-message'),
            formPermission,
            webhook,
            ...options,
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
        const { webhookEvents, apiVersions } = await this.loadWebhookOptions();
        const formPermission = options.formPermission ?? 'developers update webhook';
        const readOnly = this.abilities.cannot(formPermission);
        const selectedCredential = webhook.api_credential_uuid
            ? (this.store.peekRecord('api-credential', webhook.api_credential_uuid) ?? (await this.store.findRecord('api-credential', webhook.api_credential_uuid).catch(() => null)))
            : null;

        if (!webhook.version && apiVersions?.length) {
            webhook.version = apiVersions[apiVersions.length - 1];
        }

        return this.modalsManager.show('modals/webhook-form', {
            title: this.intl.t('developers.webhooks.form.edit-title', { endpoint: shortUrl(webhook.url) ?? '' }),
            modalClass: 'dev-modal modal-lg',
            acceptButtonText: this.intl.t('developers.webhooks.index.edit-webhook-endpoint-button-text'),
            acceptButtonIcon: 'save',
            acceptButtonDisabled: readOnly,
            declineButtonIcon: 'times',
            declineButtonIconPrefix: 'fas',
            successMessage: this.intl.t('developers.webhooks.view.update-endpoint-success-message'),
            formPermission,
            readOnly,
            webhookEvents,
            versionOptions: apiVersions,
            selectedCredential,
            urlError: null,
            webhook,
            validateUrl: (event) => {
                const value = event?.target?.value ?? webhook.url;
                this.modalsManager.setOption('urlError', isBlank(value) ? null : this.validateUrl(value));
            },
            setVersion: (value) => {
                webhook.version = value || null;
            },
            setApiCredential: (credential) => {
                this.modalsManager.setOption('selectedCredential', credential);
                webhook.api_credential_uuid = credential?.id ?? null;
            },
            setEvents: (events) => {
                webhook.events = events;
            },
            confirm: async (modal) => {
                if (this.abilities.cannot(formPermission)) {
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }

                const urlError = this.validateUrl(webhook.url);

                if (urlError) {
                    modal.setOption('urlError', urlError);
                    return;
                }

                modal.startLoading();

                try {
                    await webhook.save();
                    this.notifications.success(modal.getOption('successMessage'));
                    modal.done();
                    return this.hostRouter.refresh();
                } catch (error) {
                    const message = error?.errors?.[0]?.detail ?? error?.errors?.[0] ?? error?.message;

                    if (typeof message === 'string' && /url/i.test(message)) {
                        modal.setOption('urlError', message);
                    } else {
                        this.notifications.serverError(error);
                    }

                    modal.stopLoading();
                }
            },
            decline: (modal) => {
                if (webhook.isNew) {
                    webhook.unloadRecord();
                } else if (webhook.hasDirtyAttributes) {
                    webhook.rollbackAttributes();
                }

                modal.done();
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
        return this.modalsManager.confirm({
            title: this.intl.t('developers.webhooks.delete.title'),
            body: this.intl.t('developers.webhooks.delete.body', { endpoint: shortUrl(webhook.url) ?? '' }),
            acceptButtonText: this.intl.t('developers.webhooks.delete.accept'),
            acceptButtonScheme: 'danger',
            acceptButtonIcon: 'trash',
            actionButtons: webhook.isEnabled
                ? [
                      {
                          id: 'disable-instead',
                          text: this.intl.t('developers.webhooks.delete.disable-instead'),
                          icon: 'ban',
                          onClick: async () => {
                              await this.modalsManager.done();
                              this.disableWebhook(webhook);
                          },
                      },
                  ]
                : [],
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await webhook.destroyRecord();
                    this.notifications.success(this.intl.t('developers.webhooks.index.delete-webhook-success-message'));
                    modal.done();

                    if (typeof options.onDeleted === 'function') {
                        return options.onDeleted(webhook);
                    }

                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Disable confirm: states what stops and that nothing is queued.
     */
    @action disableWebhook(webhook, options = {}) {
        return this.modalsManager.confirm({
            title: this.intl.t('developers.webhooks.disable.title'),
            body: this.intl.t('developers.webhooks.disable.body', { endpoint: shortUrl(webhook.url) ?? '' }),
            acceptButtonText: this.intl.t('developers.webhooks.disable.accept'),
            acceptButtonIcon: 'ban',
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await webhook.disable();
                    this.notifications.success(this.intl.t('developers.webhooks.view.disable-webhook-success-message'));
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
            ...options,
        });
    }

    /**
     * Enable confirm: the URL is re-validated by the backend.
     */
    @action enableWebhook(webhook, options = {}) {
        return this.modalsManager.confirm({
            title: this.intl.t('developers.webhooks.enable.title'),
            body: this.intl.t('developers.webhooks.enable.body', { endpoint: shortUrl(webhook.url) ?? '' }),
            acceptButtonText: this.intl.t('developers.webhooks.enable.accept'),
            acceptButtonIcon: 'check',
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await webhook.enable();
                    this.notifications.success(this.intl.t('developers.webhooks.view.enable-webhook-success-message'));
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
            ...options,
        });
    }
}
