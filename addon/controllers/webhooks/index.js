import BaseController from '../base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, computed } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';
import groupApiEvents from '@fleetbase/ember-core/utils/group-api-events';
import fromStore from '@fleetbase/ember-core/decorators/from-store';
import fetchFrom from '@fleetbase/ember-core/decorators/fetch-from';

export default class WebhooksIndexController extends BaseController {
    /**
     * Inject the `currentUser` service
     *
     * @var {Service}
     */
    @service currentUser;

    /**
     * Inject the `intl` service
     *
     * @var {Service}
     */
    @service intl;

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
     * Inject the `store` service
     *
     * @var {Service}
     */
    @service store;

    /**
     * Inject the `fetch` service
     *
     * @var {Service}
     */
    @service fetch;

    /**
     * Inject the `hostRouter` service
     *
     * @var {Service}
     */
    @service hostRouter;

    /**
     * Group api events by resource
     *
     * @var {Object}
     */
    @computed('webhookEvents.[]') get groupedApiEvents() {
        return groupApiEvents(this.webhookEvents);
    }

    /**
     * The current page of data being viewed
     *
     * @var {Integer}
     */
    @tracked page = 1;

    /**
     * The maximum number of items to show per page
     *
     * @var {Integer}
     */
    @tracked limit;

    /**
     * The param to sort the data on, the param with prepended `-` is descending
     *
     * @var {String}
     */
    @tracked sort;

    /**
     * The param to sort the data on, the param with prepended `-` is descending
     *
     * @var {String}
     */
    @tracked query;

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = ['page', 'limit', 'sort', 'query'];

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
     */
    @fromStore('api-credential', { limit: -1 }) apiCredentials;

    /**
     * Columns for table component.
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: this.intl.t('developers.common.url'),
            valuePath: 'url',
            width: '40%',
            sortable: false,
            cellComponent: 'table/cell/link-to',
            route: 'webhooks.view',
            cellClassNames: 'no-underline',
        },
        {
            label: this.intl.t('developers.common.status'),
            valuePath: 'status',
            width: '15%',
            sortable: false,
            cellComponent: 'table/cell/status',
        },
        {
            label: this.intl.t('developers.common.mode'),
            valuePath: 'mode',
            width: '15%',
            sortable: false,
            cellComponent: 'table/cell/status',
        },
        { label: this.intl.t('developers.common.version'), valuePath: 'version', width: '10%', sortable: false },
        { label: this.intl.t('developers.common.created'), valuePath: 'createdAt', sortable: false, width: '10%' },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: 'API Key Actions',
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '10%',
            align: 'right',
            actions: [
                {
                    label: this.intl.t('developers.webhooks.index.view-logs'),
                    fn: this.viewWebhook,
                },
                {
                    label: this.intl.t('developers.webhooks.index.edit-webhook'),
                    fn: this.editWebhook,
                },
                {
                    label: this.intl.t('developers.webhooks.index.delete-webhook'),
                    fn: this.deleteWebhook,
                },
            ],
            sortable: false,
            filterable: false,
            resizable: false,
            searchable: false,
        },
    ];

    /**
     * The search task.
     *
     * @void
     */
    @task({ restartable: true }) *search({ target: { value } }) {
        // if no query don't search
        if (isBlank(value)) {
            this.query = null;
            return;
        }

        // timeout for typing
        yield timeout(250);

        // reset page for results
        if (this.page > 1) {
            this.page = 1;
        }

        // update the query param
        this.query = value;
    }

    /**
     * Toggles modal to create a new API key
     *
     * @void
     */
    @action createWebhook() {
        const webhook = this.store.createRecord('webhook-endpoint', {
            events: [],
            mode: this.currentUser.getOption('sandbox') ? 'test' : 'live',
        });

        this.editWebhook(webhook, {
            title: this.intl.t('developers.webhooks.index.add-webhook'),
            acceptButtonText: this.intl.t('developers.webhooks.index.add-webhook-button-text'),
            acceptButtonIcon: 'check',
            acceptButtonIconPrefix: 'fas',
            webhook,
        });
    }

    /**
     * Triggers dialog to edit webhook
     *
     * @param {WebhookEndpointModel} webhook
     * @param {Object} options
     * @void
     */
    @action editWebhook(webhook, options = {}) {
        this.modalsManager.show('modals/webhook-form', {
            title: this.intl.t('developers.webhooks.index.edit-webhook-endpoint'),
            acceptButtonText: this.intl.t('developers.webhooks.index.edit-webhook-endpoint-button-text'),
            acceptButtonIcon: 'save',
            declineButtonIcon: 'times',
            declineButtonIconPrefix: 'fas',
            eventOptions: this.groupedApiEvents,
            versionOptions: this.apiVersions,
            apiCredentialOptions: this.apiCredentials,
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
                const resources = Object.keys(this.groupedApiEvents);
                const filteredEvents = {};
                resources.forEach((eventResource) => {
                    filteredEvents[eventResource] = this.groupedApiEvents[eventResource].filter((event) => {
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
                webhook.events.pushObjects(this.webhookEvents);
            },
            confirm: (modal) => {
                modal.startLoading();

                return webhook.save().then(() => {
                    this.notifications.success(this.intl.t('developers.webhooks.index.new-webhook-success-message'));
                    return this.hostRouter.refresh();
                });
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
            confirm: (modal) => {
                modal.startLoading();

                return webhook.destroyRecord().then(() => {
                    this.notifications.success(this.intl.t('developers.webhooks.index.delete-webhook-success-message'));
                    return this.hostRouter.refresh();
                });
            },
            ...options,
        });
    }

    @action viewWebhook(webhook) {
        return this.transitionToRoute('webhooks.view', webhook);
    }
}
