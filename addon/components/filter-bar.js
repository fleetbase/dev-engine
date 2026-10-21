import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action, get, set } from '@ember/object';
import { isArray } from '@ember/array';
import { isBlank } from '@ember/utils';
import { getOwner } from '@ember/application';
import getUrlParam from '@fleetbase/ember-ui/utils/get-url-param';

/**
 * A persistent filter bar: one chip per filterable column, each opening that
 * column's filter component in a small popover, plus optional segments
 * (status classes) and a clear-all link. Reads and writes the same query
 * params the ember-ui `FiltersPicker` does, through the `filters` service, so
 * the two stay interchangeable and registered extension columns filter too.
 */
export default class FilterBarComponent extends Component {
    @service filters;
    @service intl;
    @tracked filterColumns = [];

    get hostRouter() {
        return getOwner(this).lookup('service:host-router');
    }

    constructor() {
        super(...arguments);
        this.rebuild();
        this._routeHandler = () => this.rebuild();
        this.hostRouter?.on?.('routeDidChange', this._routeHandler);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.hostRouter?.off?.('routeDidChange', this._routeHandler);
    }

    get hasActiveFilters() {
        return this.filterColumns.some((filter) => filter.isActive);
    }

    get segments() {
        return (this.args.segments ?? []).map((segment) => {
            const params = this.segmentParams(segment);
            const isActive = Object.keys(params).every((param) => {
                const expected = params[param];
                const current = this.readParam(param);

                return isBlank(expected) ? isBlank(current) : String(current) === String(expected);
            });

            return { ...segment, params, isActive };
        });
    }

    /**
     * Segments either carry one `param`/`value` pair or a `params` object; both
     * normalize to `{ param: value }` where a blank value means "clear it".
     */
    segmentParams(segment) {
        if (segment.params && typeof segment.params === 'object') {
            return segment.params;
        }

        return segment.param ? { [segment.param]: segment.value ?? null } : {};
    }

    get segmentParamNames() {
        const names = new Set();

        (this.args.segments ?? []).forEach((segment) => Object.keys(this.segmentParams(segment)).forEach((name) => names.add(name)));

        return [...names];
    }

    readParam(param) {
        const { controller } = this.args;

        if (controller && param in controller) {
            const value = get(controller, param);

            return isBlank(value) ? undefined : value;
        }

        const raw = getUrlParam(param);

        if (isArray(raw)) {
            return raw.length ? raw : undefined;
        }

        return raw === '' ? undefined : raw;
    }

    /**
     * Rebuilds the chip list from the filterable columns and the current URL.
     */
    @action rebuild() {
        const columns = this.args.columns ?? [];

        this.filterColumns = columns
            .filter((column) => column.filterable)
            .map((column) => {
                const param = column.filterParam ?? column.valuePath;
                const value = this.readParam(param);

                return {
                    ...column,
                    param,
                    filterValue: value,
                    isActive: !isBlank(value),
                    displayValue: this.displayValue(column, value),
                    chipLabel: column.filterLabel ?? column.label,
                };
            });
    }

    displayValue(column, value) {
        if (isBlank(value)) {
            return this.intl.t('developers.filter-bar.any');
        }

        const values = isArray(value) ? value : String(value).split(',');
        const options = column.filterOptions;
        const optionLabel = column.filterOptionLabel ?? 'label';
        const optionValue = column.filterOptionValue ?? 'value';

        const labels = values.map((single) => {
            if (isArray(options)) {
                const option = options.find((candidate) =>
                    typeof candidate === 'object' && candidate !== null ? String(get(candidate, optionValue)) === String(single) : String(candidate) === String(single)
                );

                if (option && typeof option === 'object') {
                    return get(option, optionLabel) ?? single;
                }
            }

            return single;
        });

        if (column.filterComponent === 'filter/date' && labels.length === 2) {
            return `${labels[0]} – ${labels[1]}`;
        }

        if (labels.length > 2) {
            return `${labels[0]} +${labels.length - 1}`;
        }

        return labels.join(', ');
    }

    @action updateFilterValue(filter, value) {
        this.filters.set(filter.param, value);
    }

    @action clearFilterValue(filter) {
        this.filters.set(filter.param, null);
    }

    @action applyFilters() {
        this.filters.apply(this.args.controller);
        this.rebuild();
    }

    @action clearFilter(filter) {
        this.filters.removeFromController(this.args.controller, filter.param, undefined);
        set(this.args.controller, 'page', 1);
        this.rebuild();
    }

    @action clearAll() {
        this.filters.reset(this.args.controller);
        this.segmentParamNames.forEach((param) => set(this.args.controller, param, undefined));
        set(this.args.controller, 'page', 1);
        this.rebuild();
    }

    @action applySegment(segment) {
        const { controller } = this.args;
        const params = this.segmentParams(segment);

        Object.keys(params).forEach((param) => set(controller, param, isBlank(params[param]) ? undefined : params[param]));

        if (segment.clears) {
            segment.clears.forEach((param) => set(controller, param, undefined));
        }

        set(controller, 'page', 1);
        this.rebuild();
    }
}
