import BaseController from '../base-controller';
import { inject as controller } from '@ember/controller';
import { inject as service } from '@ember/service';
import { action, computed } from '@ember/object';
import groupApiEvents from '@fleetbase/ember-core/utils/group-api-events';
import fromStore from '@fleetbase/ember-core/decorators/from-store';
import fetchFrom from '@fleetbase/ember-core/decorators/fetch-from';

export default class WebhooksViewController extends BaseController {
    /**
     * Inject the `webhooks.index` controller
     *
     * @var {Controller}
     */
    @controller('webhooks.index') index;

    /**
     * Inject the `modalsManager` service
     *
     * @var {Service}
     */
    @service modalsManager;

    /**
     * Inject the `intl` service
     *
     * @var {Service}
     */
    @service intl;

    /**
     * Inject the `notifications` service
     *
     * @var {Service}
     */
    @service notifications;

    /**
     * Inject the `fetch` service
     *
     * @var {Service}
     */
    @service fetch;

    /**
     * Inject the `universe` service
     *
     * @var {Service}
     */
    @service universe;

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
        this.index.deleteWebhook(webhook, {
            onConfirm: () => {
                this.notifications.success(this.intl.t('developers.webhooks.view.webhook-deleted-success-message'));
                return this.transitionToRoute('webhooks.index');
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
            confirm: (modal) => {
                modal.startLoading();
                webhook.set('status', 'disabled');
                return webhook.save().then(() => {
                    this.notifications.success(this.intl.t('developers.webhooks.view.disable-webhook-success-message'));
                });
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
            confirm: (modal) => {
                modal.startLoading();
                webhook.set('status', 'enabled');
                return webhook.save().then(() => {
                    this.notifications.success(this.intl.t('developers.webhooks.view.enable-webhook-success-message'));
                });
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
        this.index.editWebhook(webhook, {
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
}
