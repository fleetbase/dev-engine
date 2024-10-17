import BaseController from '../base-controller';
import { inject as controller } from '@ember/controller';
import { inject as service } from '@ember/service';
import { action, computed } from '@ember/object';
import groupApiEvents from '@fleetbase/ember-core/utils/group-api-events';
import fromStore from '@fleetbase/ember-core/decorators/legacy-from-store';
import fetchFrom from '@fleetbase/ember-core/decorators/legacy-fetch-from';

export default class WebhooksViewController extends BaseController {
    @controller('webhooks.index') webhooksIndexController;
    @service modalsManager;
    @service intl;
    @service notifications;
    @service fetch;
    @service universe;
    @service hostRouter;
    @service abilities;

    /**
     * All webhook events
     *
     * @memberof WebhooksIndexController
     * @var {Array}
     */
    @fetchFrom('webhook-endpoints/events') webhookEvents;

    /**
     * All api versions
     *
     * @memberof WebhooksIndexController
     * @var {Array}
     */
    @fetchFrom('webhook-endpoints/versions') apiVersions;

    /**
     * All api credentials.
     *
     * @memberof WebhooksIndexController
     * @var {Array}
     */
    @fromStore('api-credential', { limit: -1 }) apiCredentials;

    /**
     * Group api events by resource
     *
     * @var {Object}
     */
    @computed('webhookEvents.[]') get groupedApiEvents() {
        return groupApiEvents(this.webhookEvents);
    }

    /**
     * Toggles dialog to delete webhook
     *
     * @void
     */
    @action deleteWebhook(webhook) {
        this.webhooksIndexController.deleteWebhook(webhook, {
            onConfirm: () => {
                this.notifications.success(this.intl.t('developers.webhooks.view.webhook-deleted-success-message'));
                return this.hostRouter.transitionTo('console.developers.webhooks.index');
            },
        });
    }

    /**
     * Toggles dialog to disable webhook
     *
     * @void
     */
    @action disableWebhook(webhook) {
        this.modalsManager.confirm({
            title: this.intl.t('developers.webhooks.view.disable-webhook-title'),
            body: this.intl.t('developers.webhooks.view.disable-webhook-body'),
            acceptButtonText: this.intl.t('developers.webhooks.view.disable-webhook-button-text'),
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
        });
    }

    /**
     * Toggles dialog to enable webhook
     *
     * @void
     */
    @action enableWebhook(webhook) {
        this.modalsManager.confirm({
            title: this.intl.t('developers.webhooks.view.enable-webhook-title'),
            body: this.intl.t('developers.webhooks.view.enable-webhook-body'),
            acceptButtonText: this.intl.t('developers.webhooks.view.enable-webhook-button-text'),
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
        });
    }

    /**
     * Toggles modal to update webhook details
     *
     * @param {WebhookEndpointModel} webhook
     * @void
     */
    @action updateWebhookDetails(webhook) {
        this.webhooksIndexController.editWebhook(webhook, {
            acceptButtonText: this.intl.t('developers.webhooks.view.update-endpoint-button-text'),
            eventOptions: this.groupedApiEvents,
            versionOptions: this.apiVersions,
            apiCredentialOptions: this.apiCredentials,
            confirm: () => {
                return webhook.save().then(() => {
                    this.notifications.success(this.intl.t('developers.webhooks.view.update-endpoint-success-message'));
                });
            },
        });
    }

    /**
     * Reloads the view data.
     *
     * @memberof WebhooksViewController
     */
    @action reload() {
        this.hostRouter.refresh();
    }
}
