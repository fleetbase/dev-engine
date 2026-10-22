import Component from '@glimmer/component';
import EmberObject from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { task, timeout } from 'ember-concurrency';
import fetchFrom from '@fleetbase/ember-core/decorators/legacy-fetch-from';
import { formatSeconds, timeStamp } from '../../utils/format';

const RETRY_SCHEDULE = ['10 s', '100 s'];
const MAX_ATTEMPTS = 3;

/**
 * Webhook deliveries grouped per event, with filters for result, date range
 * and event type. Each group expands to an attempt timeline; clicking an
 * attempt opens the inspector drawer.
 */
export default class WebhookDeliveriesComponent extends Component {
    @service store;
    @service intl;
    @service notifications;
    @service developerPanels;
    @service urlSearchParams;

    @fetchFrom('webhook-endpoints/events') webhookEvents;

    @tracked logs = [];
    @tracked meta = null;
    @tracked page = 1;
    @tracked status = null;
    @tracked dateRange = null;
    @tracked eventType = null;
    @tracked search = null;
    @tracked error = null;

    constructor() {
        super(...arguments);
        this.restoreParams();
        this.load.perform();
    }

    restoreParams() {
        if (this.urlSearchParams.has('page')) {
            this.page = Number(this.urlSearchParams.get('page')) || 1;
        }

        if (this.urlSearchParams.has('status')) {
            this.status = this.urlSearchParams.get('status');
        }

        if (this.urlSearchParams.has('date')) {
            this.dateRange = this.urlSearchParams.get('date');
        }

        if (this.urlSearchParams.has('event')) {
            this.eventType = this.urlSearchParams.get('event');
        }
    }

    get segments() {
        return [
            { label: this.intl.t('developers.common.all'), value: null, isActive: isBlank(this.status) },
            { label: this.intl.t('developers.common.succeeded'), value: 'successful', isActive: this.status === 'successful' },
            { label: this.intl.t('developers.common.failed'), value: 'failed', isActive: this.status === 'failed' },
        ];
    }

    get eventOptions() {
        return Array.isArray(this.webhookEvents) ? this.webhookEvents : [];
    }

    get hasFilters() {
        return !isBlank(this.status) || !isBlank(this.dateRange) || !isBlank(this.eventType);
    }

    /**
     * Rows grouped by event: the newest attempt is the row, the rest its timeline.
     */
    get groups() {
        const byEvent = new Map();

        for (const log of this.logs) {
            const key = log.api_event_uuid ?? log.id;

            if (!byEvent.has(key)) {
                byEvent.set(key, []);
            }

            byEvent.get(key).push(log);
        }

        return Array.from(byEvent.values()).map((attempts) => {
            attempts.sort((a, b) => Number(a.attempt ?? 0) - Number(b.attempt ?? 0));
            const latest = attempts[attempts.length - 1];
            const succeeded = attempts.some((attempt) => attempt.status === 'successful');
            const exhausted = attempts.length >= MAX_ATTEMPTS || Number(latest.attempt ?? attempts.length) >= MAX_ATTEMPTS;
            const result = succeeded ? 'successful' : exhausted ? 'failed' : 'pending';

            return EmberObject.create({
                id: latest.id,
                latest,
                attempts,
                apiEvent: latest.api_event,
                eventName: latest.api_event?.event ?? this.intl.t('developers.resource.api-event'),
                eventId: latest.api_event?.public_id,
                result,
                resultBadge: result === 'successful' ? 'success' : result === 'failed' ? 'danger' : 'warning',
                attemptCount: attempts.length,
                statusCode: latest.status_code,
                duration: formatSeconds(latest.duration),
                sentAt: timeStamp(latest.sent_at ?? latest.created_at),
                expanded: false,
                timeline: attempts.map((attempt, index) => ({
                    attempt,
                    number: attempt.attempt ?? index + 1,
                    ok: attempt.status === 'successful',
                    statusCode: attempt.status_code,
                    reason: attempt.reason_phrase,
                    duration: formatSeconds(attempt.duration),
                    at: timeStamp(attempt.sent_at ?? attempt.created_at),
                    nextRetry: attempt.status !== 'successful' && index < MAX_ATTEMPTS - 1 && index === attempts.length - 1 && result === 'pending' ? RETRY_SCHEDULE[index] : null,
                    isFinal: attempt.status !== 'successful' && (index === MAX_ATTEMPTS - 1 || (index === attempts.length - 1 && result === 'failed')),
                })),
            });
        });
    }

    @task({ restartable: true }) *load() {
        const params = { limit: 25, sort: '-created_at', webhook_uuid: this.args.webhook?.id, page: this.page };

        if (!isBlank(this.status)) {
            params.status = this.status;
        }

        if (!isBlank(this.dateRange)) {
            params.created_at = this.dateRange;
        }

        if (!isBlank(this.eventType)) {
            params.event = this.eventType;
        }

        if (!isBlank(this.search)) {
            params.query = this.search;
        }

        try {
            const logs = yield this.store.query('webhook-request-log', params);
            this.logs = Array.from(logs);
            this.meta = logs.meta;
            this.error = null;
        } catch (error) {
            this.error = error?.message ?? this.intl.t('developers.states.error.title');
        }
    }

    syncParam(name, value) {
        if (isBlank(value)) {
            this.urlSearchParams.removeParamFromCurrentUrl(name);
        } else {
            this.urlSearchParams.addParamToCurrentUrl(name, value);
        }
    }

    @action setStatus(segment) {
        this.status = segment.value;
        this.page = 1;
        this.syncParam('status', this.status);
        this.syncParam('page', null);
        this.load.perform();
    }

    @action setDateRange({ formattedDate }) {
        this.dateRange = formattedDate || null;
        this.page = 1;
        this.syncParam('date', this.dateRange);
        this.load.perform();
    }

    @action clearDateRange() {
        this.setDateRange({ formattedDate: null });
    }

    @action setEventType(value) {
        this.eventType = value || null;
        this.page = 1;
        this.syncParam('event', this.eventType);
        this.load.perform();
    }

    @task({ restartable: true }) *searchLogs({ target: { value } }) {
        yield timeout(250);
        this.search = isBlank(value) ? null : value;
        this.page = 1;
        this.load.perform();
    }

    @action clearFilters() {
        this.status = null;
        this.dateRange = null;
        this.eventType = null;
        this.search = null;
        this.page = 1;
        ['status', 'date', 'event', 'page'].forEach((name) => this.urlSearchParams.removeParamFromCurrentUrl(name));
        this.load.perform();
    }

    @action changePage(page = 1) {
        this.page = page;
        this.syncParam('page', page > 1 ? page : null);
        this.load.perform();
    }

    @action toggleGroup(group) {
        group.toggleProperty('expanded');
    }

    @action openAttempt(attempt, event) {
        event?.stopPropagation?.();
        return this.developerPanels.openAttempt(attempt, { webhook: this.args.webhook });
    }

    @action openEvent(group, event) {
        event?.stopPropagation?.();

        if (group.apiEvent) {
            return this.developerPanels.openEvent(group.apiEvent);
        }
    }

    @action reload() {
        return this.load.perform();
    }
}
