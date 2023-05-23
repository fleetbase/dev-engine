import Controller, { inject as controller } from '@ember/controller';
import { inject as service } from '@ember/service';
import { action, computed } from '@ember/object';
import groupApiEvents from '@fleetbase/ember-core/utils/group-api-events';
import fromStore from '@fleetbase/ember-core/decorators/from-store';
import fetchFrom from '@fleetbase/ember-core/decorators/fetch-from';

export default class WebhooksViewController extends Controller {
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
                this.notifications.success(`Webhook endpoint deleted.`);
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
            title: `Disable a webhook endpoint`,
            body: 'This webhook endpoint may be temporarily disabled so that it will not receive notifications until it is enabled again. Fleetbase will not retry any notifications that are generated while the endpoint is disabled.',
            acceptButtonText: 'Disable webhook endpoint',
            confirm: (modal) => {
                modal.startLoading();
                webhook.set('status', 'disabled');
                return webhook.save().then(() => {
                    this.notifications.success(`Webhook disabled.`);
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
            title: `Enable a webhook endpoint`,
            body: "This webhook is disabled and no longer receives notifications. This may have been done automatically because we detected an extended period of failures. If you've corrected the issue, you can re-enable the webhook endpoint here. Fleetbase will not retry any notifications that were generated in the intervening period, and if we continue to detect failures on this endpoint, we will disable the endpoint again.",
            acceptButtonText: 'Enable webhook endpoint',
            confirm: (modal) => {
                modal.startLoading();
                webhook.set('status', 'enabled');
                return webhook.save().then(() => {
                    this.notifications.success(`Webhook enabled.`);
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
            acceptButtonText: 'Update endpoint',
            eventOptions: this.groupedApiEvents,
            versionOptions: this.apiVersions,
            apiCredentialOptions: this.apiCredentials,
            confirm: () => {
                return webhook.save().then(() => {
                    this.notifications.success('Webhook details updated.');
                });
            },
        });
    }
}
