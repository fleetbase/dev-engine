import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';
import fromStore from '@fleetbase/ember-core/decorators/from-store';
import fetchFrom from '@fleetbase/ember-core/decorators/fetch-from';

export default class LogsIndexController extends Controller {
    /**
     * Inject the `filters` service
     *
     * @var {Service}
     */
    @service filters;

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
    queryParams = ['query', 'page', 'limit', 'sort', 'version', 'key', 'method', 'created_at'];

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
    @tracked columns = [
        {
            label: 'Status',
            valuePath: 'status',
            width: '15%',
            sortable: false,
            cellComponent: 'table/cell/status',
            cellClassNames: 'uppercase',
        },
        {
            label: 'ID',
            valuePath: 'public_id',
            cellComponent: 'click-to-copy',
            width: '10%',
            align: 'right',
            sortable: false,
        },
        {
            label: 'Description',
            valuePath: 'description',
            width: '15%',
            sortable: false,
        },
        {
            label: 'API Credential',
            valuePath: 'api_credential_name',
            cellComponent: 'click-to-copy',
            filterParam: 'key',
            width: '25%',
            sortable: false,
            filterable: true,
            filterComponent: 'filter/select',
            filterOptionLabel: 'fullName',
            filterOptionValue: 'id',
            filterOptions: this.apiCredentials,
        },
        {
            label: 'HTTP Method',
            valuePath: 'method',
            width: '8%',
            filterable: true,
            filterComponent: 'filter/multi-option',
            filterOptions: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        },
        {
            label: 'Version',
            valuePath: 'version',
            width: '8%',
            filterable: true,
            filterComponent: 'filter/select',
            filterOptions: this.apiVersions,
        },
        {
            label: 'Date',
            valuePath: 'createdAt',
            filterParam: 'created_at',
            sortParam: 'created_at',
            sortable: false,
            width: '19%',
            align: 'right',
            filterable: true,
            filterComponent: 'filter/date',
        },
    ];

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
        return this.transitionToRoute('logs.view', log);
    }
}
