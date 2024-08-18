import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class SocketsIndexRoute extends Route {
    @service loader;
    @service abilities;
    @service notifications;
    @service hostRouter;
    @service intl;

    @action loading(transition) {
        this.loader.showOnInitialTransition(transition, 'section.next-view-section', { loadingMessage: 'Loading websockets...' });
    }

    beforeModel() {
        if (this.abilities.cannot('developers list socket')) {
            this.notifications.warning(this.intl.t('common.unauthorized-access'));
            return this.hostRouter.transitionTo('console.developers.home');
        }
    }
}
