import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { none } from '@ember/object/computed';
import copyToClipboard from '@fleetbase/ember-core/utils/copy-to-clipboard';

export default class WebhookAttemptsComponent extends Component {
    /**
     * Inject the `store` service
     *
     * @var {Service}
     */
    @service store;

    /**
     * The current viewing webhook status
     *
     * @var {String}
     */
    @tracked attemptStatus = null;

    /**
     * The webhook request logs for this endpoint.
     *
     * @var {String}
     */
    @tracked webhookRequestLogs = [];

    /**
     * The loading state for webhook request logs.
     *
     * @var {Boolean}
     */
    @tracked isLoading = false;

    /**
     * If not attempt status is set
     *
     * @var {Boolean}
     */
    @none('attemptStatus') noAttemptStatus;

    /**
     * All columns applicable for orders
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: 'Result',
            valuePath: 'result',
            width: '20%',
            cellComponent: 'table/cell/status',
            cellClassNames: 'uppercase expands-row',
        },
        { label: 'Event Type', valuePath: 'api_event.event', width: '20%' },
        {
            label: 'Event ID',
            valuePath: 'api_event.public_id',
            width: '15%',
            cellComponent: 'click-to-copy',
        },
        { label: 'Created', valuePath: 'createdAt', width: '20%', align: 'center' },
        { label: 'Attempt', valuePath: 'attempt', width: '10%' },
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
                    label: 'Copy event ID to clipboard',
                    fn: this.copyEventIdToClipboard,
                },
                {
                    label: 'View Event',
                    fn: this.viewWebhookRequestEvent,
                },
            ],
        },
    ];

    /**
     * Creates an instance of WebhookAttemptsComponent.
     * @memberof WebhookAttemptsComponent
     */
    constructor() {
        super(...arguments);
        this.loadWebhookRequestLogs();
    }

    /**
     * Load webhook request logs for this webhook
     *
     * @memberof WebhookAttemptsComponent
     */
    @action loadWebhookRequestLogs(params = {}, options = {}) {
        const { webhook } = this.args;

        this.isLoading = true;

        return this.store
            .query('webhook-request-log', { limit: -1, webhook_uuid: webhook.id, ...params }, options)
            .then((webhookRequestLogs) => {
                this.webhookRequestLogs = webhookRequestLogs;
            })
            .finally(() => {
                this.isLoading = false;
            });
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

        if (status) {
            this.loadWebhookRequestLogs({ status });
        }
    }

    /**
     * Redirects user to the event that triggered this webhook callback
     *
     * @void
     */
    @action viewWebhookRequestEvent(webhook) {
        return this.transitionToRoute('events.event', webhook.api_event);
    }

    /**
     * Copies the event id to the users clipboard
     *
     * @void
     */
    @action copyEventIdToClipboard(webhook) {
        copyToClipboard(webhook.api_event?.public_id).then(() => {
            this.notifications.info('Event ID copied to clipboard.');
        });
    }
}
