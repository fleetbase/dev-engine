import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ApiKeysIndexRoute extends Route {
    @service store;
    @service loader;
    @service currentUser;

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
        this.loader.showOnInitialTransition(transition, 'section.next-view-section', { loadingMessage: 'Loading api keys...' });
    }

    model(params) {
        return this.store.query('api-credential', { ...params });
    }

    setupController(controller) {
        controller.testMode = this.currentUser.getOption('sandbox', false);
    }
}
