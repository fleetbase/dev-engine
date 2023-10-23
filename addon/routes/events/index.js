import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class EventsIndexRoute extends Route {
    @service store;
    @service loader;

    queryParams = {
        query: {
            refreshModel: true,
        },
        page: {
            refreshModel: true,
        },
        limit: {
            refreshModel: true,
        },
        sort: {
            refreshModel: true,
        },
        created_at: {
            refreshModel: true,
        },
        event: {
            refreshModel: true,
        },
    };

    @action loading(transition) {
        this.loader.showOnInitialTransition(transition, 'section.next-view-section', { loadingMessage: 'Loading events...' });
    }

    model(params) {
        return this.store.query('api-event', params);
    }
}
