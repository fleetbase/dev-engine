import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class LogsIndexRoute extends Route {
    @service store;
    @service loader;
    @service abilities;
    @service notifications;
    @service hostRouter;
    @service intl;

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
        version: {
            refreshModel: true,
        },
        method: {
            refreshModel: true,
        },
        key: {
            refreshModel: true,
        },
        created_at: {
            refreshModel: true,
        },
    };

    @action loading(transition) {
        this.loader.showOnInitialTransition(transition, 'section.next-view-section', { loadingMessage: 'Loading logs...' });
    }

    beforeModel () {
        if (this.abilities.cannot('developers list log')) {
            this.notifications.warning(this.intl.t('common.unauthorized-access'));
            return this.hostRouter.transitionTo('console.developers.home');
        }
    }

    model(params) {
        return this.store.query('api-request-log', params);
    }
}
