import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { formatSeconds, timeStamp, statusTone } from '../../utils/format';

/**
 * The delivery attempt inspector: Request / Response / Headers / Error tabs
 * over one webhook-request-log, opened as a drawer from the deliveries list.
 */
export default class WebhookAttemptPanelComponent extends Component {
    @service intl;
    @service developerPanels;
    @service hostRouter;

    @tracked activeTab = 'request';

    get attempt() {
        return this.args.resource ?? this.args.model;
    }

    get apiEvent() {
        return this.attempt?.api_event ?? null;
    }

    get isSuccess() {
        return this.attempt?.status === 'successful';
    }

    get statusBadge() {
        return statusTone(this.attempt?.status_code);
    }

    get statusText() {
        const { status_code, reason_phrase } = this.attempt ?? {};

        return [status_code, reason_phrase].filter(Boolean).join(' ');
    }

    get duration() {
        return formatSeconds(this.attempt?.duration);
    }

    get sentAt() {
        return timeStamp(this.attempt?.sent_at ?? this.attempt?.created_at);
    }

    get requestBody() {
        return this.apiEvent?.data ?? null;
    }

    get requestHeaders() {
        return this.attempt?.headers ?? null;
    }

    get responseBody() {
        return this.attempt?.response ?? null;
    }

    get errorMeta() {
        return this.attempt?.meta ?? null;
    }

    get hasError() {
        const meta = this.errorMeta;

        return meta && typeof meta === 'object' && Object.keys(meta).length > 0;
    }

    get curl() {
        const url = this.attempt?.url ?? '';
        const headers = this.requestHeaders && typeof this.requestHeaders === 'object' ? this.requestHeaders : {};
        const lines = [`curl -X ${this.attempt?.method ?? 'POST'} '${url}'`];

        Object.keys(headers).forEach((name) => {
            const value = Array.isArray(headers[name]) ? headers[name].join(', ') : headers[name];
            lines.push(`  -H '${name}: ${String(value).replace(/'/g, "'\\''")}'`);
        });

        if (this.requestBody) {
            lines.push(`  --data-raw '${JSON.stringify(this.requestBody).replace(/'/g, "'\\''")}'`);
        }

        return lines.join(' \\\n');
    }

    get tabs() {
        return [
            { id: 'request', label: this.intl.t('developers.component.webhook.attempt-panel.tab-request'), icon: 'arrow-up-right-from-square' },
            { id: 'response', label: this.intl.t('developers.component.webhook.attempt-panel.tab-response'), icon: 'reply' },
            { id: 'headers', label: this.intl.t('developers.component.webhook.attempt-panel.tab-headers'), icon: 'list' },
            { id: 'error', label: this.intl.t('developers.component.webhook.attempt-panel.tab-error'), icon: 'triangle-exclamation', badge: this.hasError ? 1 : null },
        ];
    }

    @action setTab(tab) {
        this.activeTab = tab.id;
    }

    @action openEvent() {
        if (this.apiEvent) {
            this.args.close?.();
            return this.developerPanels.openEvent(this.apiEvent);
        }
    }
}
