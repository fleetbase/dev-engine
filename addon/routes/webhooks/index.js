import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class WebhooksIndexRoute extends Route {
    @service store;
    @service loader;
    @service abilities;
    @service notifications;
    @service hostRouter;
    @service intl;

    queryParams = {
        page: {
            refreshModel: true,
        },
        limit: {
            refreshModel: true,
        },
        sort: {
            refreshModel: true,
        },
    };

    @action loading(transition) {
        this.loader.showOnInitialTransition(transition, 'section.next-view-section', { loadingMessage: 'Loading webhooks...' });
    }

    beforeModel() {
        if (this.abilities.cannot('developers list webhook')) {
            this.notifications.warning(this.intl.t('common.unauthorized-access'));
            return this.hostRouter.transitionTo('console.developers.home');
        }
    }

    model(params) {
        return this.store.query('webhook-endpoint', params);
    }
}
