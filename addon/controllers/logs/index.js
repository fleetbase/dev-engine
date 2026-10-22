import BaseController from '../base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { task, timeout } from 'ember-concurrency';
import fromStore from '@fleetbase/ember-core/decorators/legacy-from-store';
import fetchFrom from '@fleetbase/ember-core/decorators/legacy-fetch-from';
import { RETENTION_DAYS } from '../../utils/retention';
import isRowControlClick from '../../utils/is-row-control-click';
import parseRequestQuery from '../../utils/parse-request-query';

export default class LogsIndexController extends BaseController {
    @service filters;
    @service devViewport;
    @service intl;
    @service hostRouter;
    @service abilities;
    @service developerPanels;
    @service fetch;
    @service notifications;

    @fetchFrom('webhook-endpoints/versions') apiVersions;
    @fetchFrom('metrics/dev/api-traffic', { period: '7d' }) traffic;
    @fromStore('api-credential', { limit: -1 }) apiCredentials;

    queryParams = this.registeredQueryParams('log', [
        'query',
        'page',
        'limit',
        'sort',
        'version',
        'key',
        'method',
        'created_at',
        'source',
        'status_code',
        'status_code_gte',
        'status_code_lt',
        'path',
        'ip_address',
        'duration_gte',
        'duration_lte',
    ]);

    @tracked page = 1;
    @tracked limit = 40;
    @tracked sort = '-id';
    @tracked query;
    @tracked created_at;
    @tracked version;
    @tracked method;
    @tracked key;
    @tracked source;
    @tracked status_code;
    @tracked status_code_gte;
    @tracked status_code_lt;
    @tracked path;
    @tracked ip_address;
    @tracked duration_gte;
    @tracked duration_lte;
    @tracked table;
    @tracked counts = {};
    retentionDays = RETENTION_DAYS;

    constructor() {
        super(...arguments);
        this.loadCounts.perform();
    }

    /**
     * Status-class totals for the segments, three cheap `limit=1` reads.
     */
    @task({ restartable: true }) *loadCounts() {
        const scope = {};

        ['key', 'method', 'version', 'source', 'created_at', 'path', 'ip_address', 'duration_gte', 'duration_lte', 'query'].forEach((param) => {
            if (!isBlank(this[param])) {
                scope[param] = this[param];
            }
        });

        const read = (params) => this.fetch.get('api-request-logs', { limit: 1, ...scope, ...params }).then((response) => response?.meta?.total ?? 0);

        try {
            const [all, success, client, server] = yield Promise.all([
                read({}),
                read({ status_code_gte: 200, status_code_lt: 300 }),
                read({ status_code_gte: 400, status_code_lt: 500 }),
                read({ status_code_gte: 500, status_code_lt: 600 }),
            ]);

            this.counts = { all, success, client, server };
        } catch {
            this.counts = {};
        }
    }

    get errorRate() {
        const { all = 0, client = 0, server = 0 } = this.counts;

        return all ? Math.round(((client + server) / all) * 1000) / 10 : 0;
    }

    /**
     * Built-in views: one click sets the filters it stands for.
     */
    get views() {
        return [
            { id: 'errors', label: this.intl.t('developers.logs.views.errors'), params: { status_code_gte: 400, status_code_lt: null, duration_gte: null, method: null } },
            { id: 'slow', label: this.intl.t('developers.logs.views.slow'), params: { duration_gte: 1, status_code_gte: null, status_code_lt: null, method: null } },
            { id: 'writes', label: this.intl.t('developers.logs.views.writes'), params: { method: 'POST', status_code_gte: null, status_code_lt: null, duration_gte: null } },
        ];
    }

    /**
     * Status-class segments map to `status_code_gte` / `status_code_lt`, which
     * the generic filter operator suffixes support.
     */
    get segments() {
        const { all, success, client, server } = this.counts;

        return [
            { label: this.intl.t('developers.common.all'), count: all, params: { status_code_gte: null, status_code_lt: null } },
            { label: '2xx', count: success, params: { status_code_gte: 200, status_code_lt: 300 } },
            { label: '4xx', count: client, params: { status_code_gte: 400, status_code_lt: 500 } },
            { label: '5xx', count: server, params: { status_code_gte: 500, status_code_lt: 600 } },
        ];
    }

    get columns() {
        return [
            {
                id: 'request',
                label: this.intl.t('developers.logs.index.request'),
                valuePath: 'path',
                sortable: false,
                resizable: true,
                cellComponent: 'api-request-log/request-cell',
            },
            {
                id: 'status',
                label: this.intl.t('developers.common.status'),
                valuePath: 'status_code',
                width: 120,
                sortable: false,
                cellComponent: 'api-request-log/status-cell',
            },
            {
                id: 'duration',
                label: this.intl.t('developers.logs.index.duration'),
                valuePath: 'duration',
                width: 90,
                hidden: this.devViewport.below(640),
                sortable: false,
                align: 'right',
                cellComponent: 'api-request-log/duration-cell',
            },
            {
                id: 'api-credential-name',
                label: this.intl.t('developers.logs.index.api-credential'),
                valuePath: 'api_credential_name',
                width: 170,
                hidden: this.devViewport.below(1100),
                sortable: false,
                filterable: true,
                filterParam: 'key',
                filterLabel: this.intl.t('developers.logs.index.api-credential'),
                filterComponent: 'filter/select',
                filterOptionLabel: 'fullName',
                filterOptionValue: 'id',
                filterOptions: this.apiCredentials,
                cellComponent: 'api-request-log/credential-cell',
            },
            {
                id: 'method',
                label: this.intl.t('developers.logs.index.http-method'),
                valuePath: 'method',
                width: 90,
                sortable: false,
                hidden: true,
                filterable: true,
                filterLabel: this.intl.t('developers.logs.index.http-method'),
                filterComponent: 'filter/multi-option',
                filterOptions: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
                cellComponent: 'api-request-log/method-cell',
            },
            {
                id: 'source',
                label: this.intl.t('developers.common.source'),
                valuePath: 'source',
                width: 130,
                hidden: this.devViewport.below(1280),
                sortable: false,
                filterable: true,
                filterLabel: this.intl.t('developers.common.source'),
                filterComponent: 'filter/select',
                filterOptions: [
                    { label: this.intl.t('developers.events.sources.api'), value: 'api' },
                    { label: this.intl.t('developers.events.sources.console'), value: 'console' },
                ],
                cellComponent: 'api-request-log/source-cell',
            },
            {
                id: 'version',
                label: this.intl.t('developers.common.version'),
                valuePath: 'version',
                width: 110,
                hidden: this.devViewport.below(1280),
                sortable: false,
                filterable: true,
                filterLabel: this.intl.t('developers.common.version'),
                filterComponent: 'filter/select',
                filterOptions: this.apiVersions,
                cellClassNames: 'dev-mono',
            },
            {
                id: 'created-at',
                label: this.intl.t('developers.common.time'),
                valuePath: 'created_at',
                width: 100,
                hidden: this.devViewport.below(640),
                sortable: false,
                filterable: true,
                filterLeading: true,
                filterParam: 'created_at',
                filterLabel: this.intl.t('developers.common.date'),
                filterComponent: 'filter/date',
                cellComponent: 'api-request-log/time-cell',
            },
            {
                id: 'row-actions',
                label: '',
                cellComponent: 'table/cell/dropdown',
                ddButtonText: false,
                ddButtonIcon: 'ellipsis-h',
                ddButtonIconPrefix: 'fas',
                ddMenuLabel: null,
                cellClassNames: 'overflow-visible',
                wrapperClass: 'flex items-center justify-end mx-2',
                align: 'right',
                sticky: 'right',
                width: 50,
                actions: [
                    { id: 'open', label: this.intl.t('developers.common.open'), icon: 'terminal', fn: this.openRequest, permission: 'developers view log' },
                    { id: 'copy-id', label: this.intl.t('developers.logs.actions.copy-id'), icon: 'copy', fn: this.copyId },
                    { id: 'copy-curl', label: this.intl.t('developers.code-viewer.copy-curl'), icon: 'terminal', fn: this.copyCurl },
                    { id: 'events', label: this.intl.t('developers.logs.actions.view-events'), icon: 'bolt', disabled: true, helpText: this.intl.t('developers.common.unavailable-later') },
                    { separator: true },
                    { id: 'filter-path', label: this.intl.t('developers.logs.actions.filter-path'), icon: 'filter', fn: this.filterByPath },
                    { id: 'filter-ip', label: this.intl.t('developers.logs.actions.filter-ip'), icon: 'filter', fn: this.filterByIp },
                ],
            },
        ];
    }

    get emptyState() {
        return {
            icon: 'terminal',
            title: this.intl.t('developers.logs.empty.title'),
            message: this.intl.t('developers.logs.empty.message', { days: RETENTION_DAYS }),
        };
    }

    @task({ restartable: true }) *search({ target: { value } }) {
        yield timeout(250);

        const { query, params } = parseRequestQuery(value);

        Object.keys(params).forEach((param) => {
            this[param] = params[param];
        });

        this.query = isBlank(query) ? null : query;
        this.page = 1;
        this.loadCounts.perform();
    }

    @action applyView(view) {
        Object.keys(view.params).forEach((param) => {
            this[param] = view.params[param] ?? undefined;
        });

        this.page = 1;
        this.loadCounts.perform();
    }

    @action openRequest(log) {
        return this.developerPanels.openRequest(log);
    }

    @action openFullPage(log) {
        return this.hostRouter.transitionTo('console.developers.logs.view', log);
    }

    @action copyId(log) {
        return navigator.clipboard?.writeText(log.public_id).then(() => this.notifications.info(this.intl.t('developers.code-viewer.copied')));
    }

    @action copyCurl(log) {
        return navigator.clipboard?.writeText(log.curl).then(() => this.notifications.info(this.intl.t('developers.code-viewer.copied-curl')));
    }

    @action filterByPath(log) {
        this.path = log.path;
        this.page = 1;
        this.loadCounts.perform();
    }

    @action filterByIp(log) {
        this.ip_address = log.ip_address;
        this.page = 1;
        this.loadCounts.perform();
    }

    @action reload() {
        this.loadCounts.perform();
        return this.hostRouter.refresh();
    }

    /**
     * Row clicks open the record unless the click landed on a control inside the row.
     */
    @action rowClick(row) {
        if (isRowControlClick()) {
            return;
        }

        return this.openRequest(row);
    }
}
