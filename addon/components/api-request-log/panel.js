import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import copyToClipboard from '@fleetbase/ember-core/utils/copy-to-clipboard';
import { byteSize, formatSeconds, timeStamp, statusTone } from '../../utils/format';

const SECRET_HEADERS = ['authorization', 'x-api-key', 'cookie', 'set-cookie'];

function countKeys(value) {
    return value && typeof value === 'object' ? Object.keys(value).length : 0;
}

/**
 * The request detail: facts, tabs for query params, request headers, request
 * body, response headers and response body, and copy as cURL. Used by the
 * drawer and the full page.
 */
export default class ApiRequestLogPanelComponent extends Component {
    @service intl;
    @service notifications;
    @service developerPanels;
    @service hostRouter;

    @tracked activeTab = 'request-body';
    @tracked headerSide = 'request';

    get log() {
        return this.args.resource ?? this.args.model;
    }

    get statusBadge() {
        return statusTone(this.log?.status_code);
    }

    get statusText() {
        return [this.log?.status_code, this.log?.reason_phrase].filter(Boolean).join(' ');
    }

    get duration() {
        return formatSeconds(this.log?.duration);
    }

    get isSlow() {
        return Number(this.log?.duration ?? 0) >= 1;
    }

    get createdAt() {
        return timeStamp(this.log?.created_at, 'MMM d, yyyy HH:mm:ss.SSS');
    }

    get isError() {
        return Number(this.log?.status_code ?? 0) >= 400;
    }

    get responseContentType() {
        const headers = this.log?.response_headers;

        if (!headers || typeof headers !== 'object') {
            return null;
        }

        const key = Object.keys(headers).find((name) => name.toLowerCase() === 'content-type');
        const value = key ? headers[key] : null;

        return Array.isArray(value) ? value[0] : value;
    }

    /**
     * Header rows for the side-by-side error view, masked like the cURL output.
     */
    get headerRows() {
        const source = this.headerSide === 'response' ? this.log?.response_headers : this.maskedRequestHeaders;

        if (!source || typeof source !== 'object') {
            return [];
        }

        return Object.keys(source).map((name) => ({
            name: name.toLowerCase(),
            value: Array.isArray(source[name]) ? source[name].join(', ') : String(source[name]),
            masked: this.headerSide === 'request' && SECRET_HEADERS.includes(name.toLowerCase()),
        }));
    }

    @action setHeaderSide(side) {
        this.headerSide = side;
    }

    get requestBody() {
        return isBlank(this.log?.request_body) ? this.log?.request_raw_body : this.log?.request_body;
    }

    get responseBody() {
        return isBlank(this.log?.response_body) ? this.log?.response_raw_body : this.log?.response_body;
    }

    get requestSize() {
        return byteSize(this.requestBody);
    }

    get responseSize() {
        return byteSize(this.responseBody);
    }

    /**
     * Request headers with credentials masked for display and cURL.
     */
    get maskedRequestHeaders() {
        const headers = this.log?.request_headers;

        if (!headers || typeof headers !== 'object') {
            return headers;
        }

        const masked = {};

        Object.keys(headers).forEach((name) => {
            const value = Array.isArray(headers[name]) ? headers[name].join(', ') : headers[name];
            masked[name] = SECRET_HEADERS.includes(name.toLowerCase()) ? this.maskSecret(String(value)) : value;
        });

        return masked;
    }

    maskSecret(value) {
        const match = value.match(/^(Bearer\s+)?(\S{0,12})/i);
        const prefix = match ? `${match[1] ?? ''}${match[2] ?? ''}` : value.slice(0, 12);

        return `${prefix}••••`;
    }

    get relatedResources() {
        const related = this.log?.related_resources ?? this.log?.related;

        if (Array.isArray(related)) {
            return related.map((item) => (typeof item === 'string' ? item : (item?.public_id ?? item?.id ?? JSON.stringify(item))));
        }

        if (related && typeof related === 'object') {
            return Object.values(related).flat().map(String);
        }

        return [];
    }

    get curl() {
        const log = this.log ?? {};
        const lines = [`curl -X ${log.method ?? 'GET'} '${log.full_url ?? log.path ?? ''}'`];
        const headers = this.maskedRequestHeaders && typeof this.maskedRequestHeaders === 'object' ? this.maskedRequestHeaders : {};

        Object.keys(headers)
            .filter((name) => !['host', 'content-length', 'connection', 'accept-encoding'].includes(name.toLowerCase()))
            .forEach((name) => {
                lines.push(`  -H '${name}: ${String(headers[name]).replace(/'/g, "'\\''")}'`);
            });

        const body = this.requestBody;

        if (!isBlank(body) && log.method && log.method !== 'GET') {
            const raw = typeof body === 'string' ? body : JSON.stringify(body);
            lines.push(`  --data-raw '${raw.replace(/'/g, "'\\''")}'`);
        }

        return lines.join(' \\\n');
    }

    get tabs() {
        const log = this.log ?? {};

        return [
            { id: 'query-params', label: this.intl.t('developers.logs.panel.tab-query'), badge: countKeys(log.query_params) || null },
            { id: 'request-headers', label: this.intl.t('developers.logs.panel.tab-request-headers'), badge: countKeys(log.request_headers) || null },
            { id: 'request-body', label: this.intl.t('developers.logs.panel.tab-request-body') },
            { id: 'response-headers', label: this.intl.t('developers.logs.panel.tab-response-headers'), badge: countKeys(log.response_headers) || null },
            { id: 'response-body', label: this.intl.t('developers.logs.panel.tab-response-body') },
        ];
    }

    @action setTab(tab) {
        this.activeTab = tab.id;
    }

    @action copyCurl() {
        return copyToClipboard(this.curl).then(() => this.notifications.info(this.intl.t('developers.code-viewer.copied-curl')));
    }

    @action copyId() {
        return copyToClipboard(this.log.public_id).then(() => this.notifications.info(this.intl.t('developers.code-viewer.copied')));
    }

    @action openFullPage() {
        return this.developerPanels.openFullPage('logs.view', this.log);
    }

    @action requestsFromIp() {
        this.args.close?.();
        return this.hostRouter.transitionTo('console.developers.logs.index', { queryParams: { query: this.log.ip_address } });
    }

    @action requestsForKey() {
        this.args.close?.();
        return this.hostRouter.transitionTo('console.developers.logs.index', { queryParams: { key: this.log.api_credential_uuid } });
    }
}
