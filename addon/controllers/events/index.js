import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';
import fetchFrom from '@fleetbase/ember-core/decorators/fetch-from';

export default class EventsIndexController extends Controller {
    /**
     * Inject the `filters` service
     *
     * @var {Service}
     */
    @service filters;

    /**
     * All api versions
     *
     * @memberof LogsIndexController
     * @var {Array}
     */
    @fetchFrom('webhook-endpoints/events') webhookEvents;

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = ['query', 'page', 'limit', 'sort', 'event', 'created_at'];

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
     * The filterable `event`
     *
     * @var {String}
     */
    @tracked event;

    /**
     * Columns for table component.
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: 'Event',
            valuePath: 'description',
            width: '40%',
            sortable: false,
        },
        {
            label: 'Code',
            valuePath: 'event',
            width: '20%',
            sortable: false,
            filterable: true,
            filterComponent: 'filter/select',
            filterOptions: this.webhookEvents,
        },
        {
            label: 'ID',
            valuePath: 'public_id',
            cellComponent: 'click-to-copy',
            width: '20%',
            align: 'right',
            sortable: false,
        },
        {
            label: 'Date',
            valuePath: 'createdAt',
            filterParam: 'created_at',
            sortParam: 'created_at',
            sortable: false,
            width: '20%',
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
        return this.transitionToRoute('events.view', log);
    }
}
