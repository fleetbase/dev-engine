import BaseController from '../base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { task, timeout } from 'ember-concurrency';
import fromStore from '@fleetbase/ember-core/decorators/legacy-from-store';
import fetchFrom from '@fleetbase/ember-core/decorators/legacy-fetch-from';
import { RETENTION_DAYS } from '../../utils/retention';

export default class LogsIndexController extends BaseController {
    @service filters;
    @service devViewport;
    @service intl;
    @service hostRouter;
    @service abilities;
    @service developerPanels;

    @fetchFrom('webhook-endpoints/versions') apiVersions;
    @fromStore('api-credential', { limit: -1 }) apiCredentials;

    queryParams = this.registeredQueryParams('log', ['query', 'page', 'limit', 'sort', 'version', 'key', 'method', 'created_at', 'source', 'status_code_gte', 'status_code_lt']);

    @tracked page = 1;
    @tracked limit = 40;
    @tracked sort = '-id';
    @tracked query;
    @tracked created_at;
    @tracked version;
    @tracked method;
    @tracked key;
    @tracked source;
    @tracked status_code_gte;
    @tracked status_code_lt;
    @tracked table;
    retentionDays = RETENTION_DAYS;

    /**
     * Status-class segments map to `status_code_gte` / `status_code_lt`, which
     * the generic filter operator suffixes support.
     */
    get segments() {
        return [
            { label: this.intl.t('developers.common.all'), params: { status_code_gte: null, status_code_lt: null } },
            { label: '2xx', params: { status_code_gte: 200, status_code_lt: 300 } },
            { label: '4xx', params: { status_code_gte: 400, status_code_lt: 500 } },
            { label: '5xx', params: { status_code_gte: 500, status_code_lt: 600 } },
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
                width: 100,
                hidden: this.devViewport.below(1280),
                sortable: false,
                filterable: true,
                filterLabel: this.intl.t('developers.common.source'),
                filterComponent: 'filter/select',
                filterOptions: [
                    { label: this.intl.t('developers.events.sources.api'), value: 'api' },
                    { label: this.intl.t('developers.events.sources.console'), value: 'console' },
                ],
                cellComponent: 'table/cell/status',
            },
            {
                id: 'version',
                label: this.intl.t('developers.common.version'),
                valuePath: 'version',
                width: 90,
                hidden: this.devViewport.below(1440),
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
                width: 150,
                sortable: false,
                filterable: true,
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
                    { id: 'open-page', label: this.intl.t('developers.common.open-full-page'), icon: 'arrow-up-right-from-square', fn: this.openFullPage, permission: 'developers view log' },
                    { id: 'copy-id', label: this.intl.t('developers.logs.actions.copy-id'), icon: 'copy', fn: this.copyId },
                    { id: 'copy-curl', label: this.intl.t('developers.code-viewer.copy-curl'), icon: 'terminal', fn: this.copyCurl },
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

    search = task({ restartable: true }, async ({ target: { value } }) => {
        if (isBlank(value)) {
            this.query = null;
            return;
        }

        await timeout(250);

        if (this.page > 1) {
            this.page = 1;
        }

        this.query = value;
    });

    @action openRequest(log) {
        return this.developerPanels.openRequest(log);
    }

    @action openFullPage(log) {
        return this.hostRouter.transitionTo('console.developers.logs.view', log);
    }

    @action copyId(log) {
        return navigator.clipboard?.writeText(log.public_id);
    }

    @action copyCurl(log) {
        return navigator.clipboard?.writeText(log.curl);
    }

    @action filterByPath(log) {
        this.query = log.path;
        this.page = 1;
    }

    @action filterByIp(log) {
        this.query = log.ip_address;
        this.page = 1;
    }

    @action reload() {
        return this.hostRouter.refresh();
    }
}
