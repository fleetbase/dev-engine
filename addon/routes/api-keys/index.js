import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { later } from '@ember/runloop';

export default class ApiKeysIndexRoute extends Route {
    @service store;
    @service loader;
    @service currentUser;
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
        query: {
            refreshModel: true,
        },
        view_api_key: {
            refreshModel: false,
        },
        sort: {
            refreshModel: true,
        },
        expires_at: {
            refreshModel: true,
        },
        last_used_at: {
            refreshModel: true,
        },
    };

    @action loading(transition) {
        this.loader.showOnInitialTransition(transition, 'section.next-view-section', { loadingMessage: this.intl.t('developers.api-keys.index.loading') });
    }

    beforeModel() {
        if (this.abilities.cannot('developers list api-key')) {
            this.notifications.warning(this.intl.t('common.unauthorized-access'));
            return this.hostRouter.transitionTo('console.developers.home');
        }
    }

    model(params) {
        const queryParams = { ...params };
        delete queryParams.view_api_key;

        return this.store.query('api-credential', { ...queryParams });
    }

    setupController(controller) {
        super.setupController(...arguments);
        later(controller, controller.openDeepLinkedApiKey);
    }
}
