import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import groupApiEvents from '@fleetbase/ember-core/utils/group-api-events';

/**
 * Grouped event-type picker: a searchable list grouped by resource prefix with
 * group checkboxes, selected chips that collapse to a wildcard when a whole
 * group is selected, and an "All events" toggle that maps to an empty list
 * (which the API treats as every event).
 *
 * @param {Array} events every subscribable event name
 * @param {Array} selected the webhook's `events`
 * @param {Function} onChange called with the new array
 * @param {Boolean} disabled
 */
export default class WebhookEventPickerComponent extends Component {
    @tracked query = '';

    get all() {
        return isArray(this.args.events) ? this.args.events : [];
    }

    get selected() {
        return isArray(this.args.selected) ? Array.from(this.args.selected) : [];
    }

    get isAllEvents() {
        return this.selected.length === 0;
    }

    get groups() {
        const grouped = groupApiEvents(this.all);
        const query = this.query.trim().toLowerCase();
        const selected = new Set(this.selected);

        return Object.keys(grouped)
            .sort()
            .map((resource) => {
                const events = grouped[resource].filter((event) => !query || event.toLowerCase().includes(query));
                const selectedCount = grouped[resource].filter((event) => selected.has(event)).length;

                return {
                    resource,
                    label: resource.replace(/_/g, ' '),
                    total: grouped[resource].length,
                    selectedCount,
                    isAllSelected: selectedCount === grouped[resource].length,
                    events: events.map((event) => ({ name: event, isSelected: selected.has(event) })),
                };
            })
            .filter((group) => group.events.length > 0);
    }

    /**
     * Chips: a whole group collapses to `prefix.*`.
     */
    get chips() {
        const grouped = groupApiEvents(this.all);
        const selected = new Set(this.selected);
        const chips = [];

        Object.keys(grouped)
            .sort()
            .forEach((resource) => {
                const events = grouped[resource];
                const chosen = events.filter((event) => selected.has(event));

                if (chosen.length === events.length && events.length > 1) {
                    chips.push({ label: `${resource}.*`, events: chosen });
                } else {
                    chosen.forEach((event) => chips.push({ label: event, events: [event] }));
                }
            });

        return chips;
    }

    emit(next) {
        if (typeof this.args.onChange === 'function') {
            this.args.onChange(next);
        }
    }

    @action search(event) {
        this.query = event.target.value ?? '';
    }

    @action toggleEvent(name) {
        const next = new Set(this.selected);

        if (next.has(name)) {
            next.delete(name);
        } else {
            next.add(name);
        }

        this.emit(Array.from(next));
    }

    @action toggleGroup(group) {
        const next = new Set(this.selected);
        const events = groupApiEvents(this.all)[group.resource] ?? [];

        if (group.isAllSelected) {
            events.forEach((event) => next.delete(event));
        } else {
            events.forEach((event) => next.add(event));
        }

        this.emit(Array.from(next));
    }

    @action removeChip(chip) {
        const remove = new Set(chip.events);

        this.emit(this.selected.filter((event) => !remove.has(event)));
    }

    @action clear() {
        this.emit([]);
    }

    @action setAllEvents(enabled) {
        if (enabled) {
            this.emit([]);
        } else if (this.selected.length === 0) {
            // Leaving "all events" needs an explicit choice; start with nothing selected but mark the mode.
            this.emit(this.all.length ? [this.all[0]] : []);
        }
    }
}
