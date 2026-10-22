import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import { shortUrl, timeStamp, formatSeconds } from '../../utils/format';
import { eventIcon } from '../../utils/resource-descriptors';

/**
 * The event detail: facts, payload and the webhook deliveries this event
 * produced. Used by the drawer and the full page.
 */
export default class ApiEventPanelComponent extends Component {
    @service store;
    @service intl;
    @service hostRouter;
    @service developerPanels;
    @service notifications;

    @tracked deliveries = [];
    @tracked error = null;
    @tracked activeTab = 'overview';

    constructor() {
        super(...arguments);
        this.load.perform();
    }

    get event() {
        return this.args.resource ?? this.args.model;
    }

    get icon() {
        return eventIcon(this.event?.event);
    }

    get createdAt() {
        return timeStamp(this.event?.created_at, 'MMM d, yyyy HH:mm:ss');
    }

    get resourceId() {
        const data = this.event?.data;

        return data && typeof data === 'object' ? (data.public_id ?? data.id ?? null) : null;
    }

    get credentialName() {
        const id = this.event?.api_credential_uuid;

        if (!id) {
            return null;
        }

        return this.store.peekRecord('api-credential', id)?.name ?? id;
    }

    get channels() {
        const channels = [];
        const companyId = this.event?.company_uuid;

        if (companyId) {
            channels.push(`company.${companyId}`);
        }

        if (this.event?.api_credential_uuid) {
            channels.push(`api.${this.event.api_credential_uuid}`);
        }

        return channels;
    }

    get tabs() {
        return [
            { id: 'overview', label: this.intl.t('developers.common.overview'), icon: 'circle-info' },
            { id: 'payload', label: this.intl.t('developers.events.panel.payload'), icon: 'code' },
            { id: 'deliveries', label: this.intl.t('developers.webhooks.deliveries.title'), icon: 'paper-plane', badge: this.deliveries.length || null },
        ];
    }

    get deliveryRows() {
        return this.deliveries.map((attempt) => ({
            attempt,
            shortUrl: shortUrl(attempt.url),
            ok: attempt.status === 'successful',
            statusText: [attempt.status_code, attempt.reason_phrase].filter(Boolean).join(' '),
            duration: formatSeconds(attempt.duration),
            at: timeStamp(attempt.sent_at ?? attempt.created_at),
        }));
    }

    @task *load() {
        const event = this.event;

        if (!event?.id) {
            return;
        }

        try {
            const deliveries = yield this.store.query('webhook-request-log', { api_event_uuid: event.id, limit: 50, sort: '-created_at' });
            this.deliveries = Array.from(deliveries);
            this.error = null;
        } catch (error) {
            this.error = error?.message ?? null;
        }
    }

    @action setTab(tab) {
        this.activeTab = tab.id;
    }

    @action openAttempt(attempt) {
        return this.developerPanels.openAttempt(attempt);
    }

    @action openFullPage() {
        return this.developerPanels.openFullPage('events.view', this.event);
    }

    @action watchChannel(name) {
        this.args.close?.();
        return this.hostRouter.transitionTo('console.developers.sockets.view', name);
    }

    @action copyId() {
        return navigator.clipboard?.writeText(this.event.public_id).then(() => this.notifications.info(this.intl.t('developers.code-viewer.copied')));
    }
}
