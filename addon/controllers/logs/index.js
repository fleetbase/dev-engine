import BaseController from '../base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, computed } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';
import fromStore from '@fleetbase/ember-core/decorators/legacy-from-store';
import fetchFrom from '@fleetbase/ember-core/decorators/legacy-fetch-from';

export default class LogsIndexController extends BaseController {
    @service filters;
    @service intl;
    @service hostRouter;
    @service abilities;

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
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = this.registeredQueryParams('log', ['query', 'page', 'limit', 'sort', 'version', 'key', 'method', 'created_at']);

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
    @tracked limit = 40;

    /**
     * The param to sort the data on, the param with prepended `-` is descending
     *
     * @var {String}
     */
    @tracked sort = '-id';

    /**
     * The param to query the data by
     *
     * @var {String}
     */
    @tracked query;

    /**
     * The filterable param `created_at`
     *
     * @var {String}
     */
    @tracked created_at;

    /**
     * The filterable param `version`
     *
     * @var {String}
     */
    @tracked version;

    /**
     * The filterable param `method`
     *
     * @var {String}
     */
    @tracked method;

    /**
     * The filterable param `key`
     *
     * @var {String}
     */
    @tracked key;

    /**
     * Columns for table component.
     *
     * @var {Array}
     */
    @computed('apiCredentials.@each.id', 'apiVersions.[]') get columns() {
        return [
            {
                id: 'description',
                sticky: true,
                label: this.intl.t('developers.common.description'),
                valuePath: 'description',
                sortable: false,
            },
            {
                id: 'status',
                label: this.intl.t('developers.common.status'),
                valuePath: 'status',
                sortable: false,
                cellComponent: 'table/cell/status',
                cellClassNames: 'uppercase',
            },
            {
                id: 'public-id',
                label: this.intl.t('developers.common.id'),
                valuePath: 'public_id',
                cellComponent: 'click-to-copy',
                align: 'right',
                sortable: false,
            },
            {
                id: 'api-credential-name',
                label: this.intl.t('developers.logs.index.api-credential'),
                valuePath: 'api_credential_name',
                cellComponent: 'click-to-copy',
                filterParam: 'key',
                sortable: false,
                filterable: true,
                filterComponent: 'filter/select',
                filterOptionLabel: 'fullName',
                filterOptionValue: 'id',
                filterOptions: this.apiCredentials,
            },
            {
                id: 'method',
                label: this.intl.t('developers.logs.index.http-method'),
                valuePath: 'method',
                filterable: true,
                filterComponent: 'filter/multi-option',
                filterOptions: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            },
            {
                id: 'version',
                label: this.intl.t('developers.common.version'),
                valuePath: 'version',
                filterable: true,
                filterComponent: 'filter/select',
                filterOptions: this.apiVersions,
            },
            {
                id: 'created-at',
                label: this.intl.t('developers.common.date'),
                valuePath: 'createdAt',
                filterParam: 'created_at',
                sortParam: 'created_at',
                sortable: false,
                align: 'right',
                filterable: true,
                filterComponent: 'filter/date',
            },
        ];
    }

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

    /**
     * Link user to full request log view
     *
     * @void
     */
    @action onRowClick(log) {
        return this.hostRouter.transitionTo('console.developers.logs.view', log);
    }

    /**
     * Reload data.
     */
    @action reload() {
        return this.hostRouter.refresh();
    }
}
