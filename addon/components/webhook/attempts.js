import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import copyToClipboard from '@fleetbase/ember-core/utils/copy-to-clipboard';

export default class WebhookAttemptsComponent extends Component {
    @service store;
    @service intl;
    @service hostRouter;
    @service notifications;
    @tracked attemptStatus = null;
    @tracked webhookRequestLogs = [];
    @tracked webhook;

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
        this.getWebhookRequestLogs.perform();
    }


    @task *getWebhookRequestLogs(params = {}, options = {}) {
        try {
            this.webhookRequestLogs = yield this.store.query('webhook-request-log', { limit: -1, sort: '-created_at', webhook_uuid: this.webhook.id, ...params }, options);
        } catch (error) {
            this.notifications.serverError(error);
        }
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
