import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ApiKeysIndexRoute extends Route {
    @service store;
    @service loader;

    queryParams = {
        page: {
            refreshModel: true,
        },
        limit: {
            refreshModel: true,
        },
        query: {
            refreshModel: true,
        },
        sort: {
            refreshModel: true,
        },
    };

    @action loading(transition) {
        this.loader.showOnInitialTransition(transition, 'section.next-view-section', 'Loading api keys...');
    }

    model(params) {
        return this.store.query('api-credential', { ...params });
    }
}
