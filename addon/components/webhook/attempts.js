import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import copyToClipboard from '@fleetbase/ember-core/utils/copy-to-clipboard';

function filterParams(obj) {
    // eslint-disable-next-line no-unused-vars
    return Object.fromEntries(Object.entries(obj).filter(([_, value]) => value !== null && value !== undefined));
}

export default class WebhookAttemptsComponent extends Component {
    @service store;
    @service intl;
    @service hostRouter;
    @service notifications;
    @service urlSearchParams;
    @tracked attemptStatus = null;
    @tracked webhookRequestLogs = [];
    @tracked webhook;
    @tracked page = 1;
    @tracked date = null;

    /**
     * All columns applicable for orders
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: this.intl.t('developers.common.result'),
            valuePath: 'result',
            width: '20%',
            cellComponent: 'table/cell/status',
            cellClassNames: 'uppercase expands-row',
        },
        { label: this.intl.t('developers.common.event-type'), valuePath: 'api_event.event', width: '20%' },
        {
            label: this.intl.t('developers.common.event-id'),
            valuePath: 'api_event.public_id',
            width: '15%',
            cellComponent: 'click-to-copy',
        },
        { label: this.intl.t('developers.common.created'), valuePath: 'createdAt', width: '20%', align: 'center' },
        { label: this.intl.t('developers.common.attempt'), valuePath: 'attempt', width: '10%' },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: 'Webhook Log Actions',
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '10%',
            align: 'right',
            actions: [
                // { label: 'Resend', action: this.viewWebhookRequestEvent },
                {
                    label: this.intl.t('developers.component.webhook.attempts.copy-event-id'),
                    fn: this.copyEventIdToClipboard,
                },
                {
                    label: this.intl.t('developers.component.webhook.attempts.view-event'),
                    fn: this.viewWebhookRequestEvent,
                },
            ],
        },
    ];

    /**
     * Creates an instance of WebhookAttemptsComponent.
     * @memberof WebhookAttemptsComponent
     */
    constructor(owner, { webhook }) {
        super(...arguments);
        this.webhook = webhook;
        this.restoreParams();
        this.getWebhookRequestLogs.perform();
    }

    restoreParams() {
        if (this.urlSearchParams.has('page')) {
            this.page = new Number(this.urlSearchParams.get('page'));
        }

        if (this.urlSearchParams.has('status')) {
            this.status = this.urlSearchParams.get('status');
        }

        if (this.urlSearchParams.has('date')) {
            this.status = this.urlSearchParams.get('date');
        }
    }

    /**
     * Load webhook request logs.
     *
     * @param {Object} [params={}]
     * @param {Object} [options={}]
     * @memberof WebhookAttemptsComponent
     */
    @task *getWebhookRequestLogs(params = {}, options = {}) {
        params = filterParams({ ...params, created_at: this.date, status: this.attemptStatus, page: this.page });

        try {
            this.webhookRequestLogs = yield this.store.query('webhook-request-log', { limit: 12, sort: '-created_at', webhook_uuid: this.webhook.id, page: this.page, ...params }, options);
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    /**
     * Filter webhook attempt logs by date.
     *
     * @param {Object} { formattedDate }
     * @memberof WebhookAttemptsComponent
     */
    @action filterByDate({ formattedDate }) {
        this.date = formattedDate;
        this.urlSearchParams.addParamToCurrentUrl('date', formattedDate);
        this.getWebhookRequestLogs.perform();
    }

    /**
     * Clear date filter.
     *
     * @memberof WebhookAttemptsComponent
     */
    @action clearDate() {
        this.date = null;
        this.urlSearchParams.removeParamFromCurrentUrl('date');
        this.getWebhookRequestLogs.perform();
    }

    /**
     * Handle page change.
     *
     * @param {number} [page=1]
     * @memberof WebhookAttemptsComponent
     * @void
     */
    @action changePage(page = 1) {
        this.page = page;
        this.urlSearchParams.addParamToCurrentUrl('page', page);
        this.getWebhookRequestLogs.perform();
    }

    /**
     * @void
     */
    @action onRowClick(row, { target }) {
        // is target an expandable column
        const columnTriggersExpand = target.closest('td').classList.contains('expands-row');

        // if column can trigger the expanding toggle
        if (columnTriggersExpand) {
            row.toggleProperty('expanded');
        }
    }

    /**
     * Sets the webhook attempt status and updates the table
     *
     * @void
     */
    @action changeAttemptStatus(status) {
        status = typeof status === 'string' ? status : null;

        this.attemptStatus = status;
        if (status === null) {
            this.urlSearchParams.removeParamFromCurrentUrl('status');
        } else {
            this.urlSearchParams.addParamToCurrentUrl('status', status);
        }
        this.getWebhookRequestLogs.perform();
    }

    /**
     * Redirects user to the event that triggered this webhook callback
     *
     * @void
     */
    @action viewWebhookRequestEvent(webhook) {
        return this.hostRouter.transitionTo('console.developers.events.view', webhook.api_event);
    }

    /**
     * Copies the event id to the users clipboard
     *
     * @void
     */
    @action copyEventIdToClipboard(webhook) {
        copyToClipboard(webhook.api_event?.public_id).then(() => {
            this.notifications.info(this.intl.t('developers.component.webhook.attempts.info-message'));
        });
    }
}
