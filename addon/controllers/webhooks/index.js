import BaseController from '../base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, computed } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';
import groupApiEvents from '@fleetbase/ember-core/utils/group-api-events';
import fromStore from '@fleetbase/ember-core/decorators/legacy-from-store';
import fetchFrom from '@fleetbase/ember-core/decorators/legacy-fetch-from';

export default class WebhooksIndexController extends BaseController {
    @service webhookActions;
    @service currentUser;
    @service intl;
    @service modalsManager;
    @service notifications;
    @service store;
    @service fetch;
    @service hostRouter;
    @service abilities;

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
            permission: 'developers view webhook',
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
                    permission: 'developers view webhook',
                },
                {
                    label: this.intl.t('developers.webhooks.index.edit-webhook'),
                    fn: this.editWebhook,
                    permission: 'developers update webhook',
                },
                {
                    label: this.intl.t('developers.webhooks.index.delete-webhook'),
                    fn: this.deleteWebhook,
                    permission: 'developers delete webhook',
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

    // Webhook dialogs live in the webhook-actions service so other engines can open them too.
    @action createWebhook(...args) {
        return this.webhookActions.createWebhook(...args);
    }

    @action editWebhook(...args) {
        return this.webhookActions.editWebhook(...args);
    }

    @action deleteWebhook(...args) {
        return this.webhookActions.deleteWebhook(...args);
    }

    /**
     * Transition to view the webhook
     *
     * @param {WebhookEndpointModel} webhook
     * @return {Transition<Promise>}
     * @memberof WebhooksIndexController
     */
    @action viewWebhook(webhook) {
        return this.hostRouter.transitionTo('console.developers.webhooks.view', webhook);
    }

    /**
     * Reload data.
     */
    @action reload() {
        return this.hostRouter.refresh();
    }
}
