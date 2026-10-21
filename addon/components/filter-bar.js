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
        return (this.args.segments ?? []).map((segment) => ({
            ...segment,
            isActive: this.readParam(segment.param) === (segment.value ?? undefined) || (isBlank(segment.value) && isBlank(this.readParam(segment.param))),
        }));
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
        (this.args.segments ?? []).forEach((segment) => set(this.args.controller, segment.param, undefined));
        set(this.args.controller, 'page', 1);
        this.rebuild();
    }

    @action applySegment(segment) {
        const { controller } = this.args;

        set(controller, segment.param, isBlank(segment.value) ? undefined : segment.value);

        if (segment.clears) {
            segment.clears.forEach((param) => set(controller, param, undefined));
        }

        set(controller, 'page', 1);
        this.rebuild();
    }
}
