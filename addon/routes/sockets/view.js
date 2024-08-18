import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class SocketsViewRoute extends Route {
    @service abilities;
    @service notifications;
    @service hostRouter;
    @service intl;

    beforeModel() {
        if (this.abilities.cannot('developers view socket')) {
            this.notifications.warning(this.intl.t('common.unauthorized-access'));
            return this.hostRouter.transitionTo('console.developers.sockets.index');
        }
    }

    model({ name }) {
        return { name };
    }

    async setupController(controller, model) {
        controller.watchSocket(model);
    }
}
