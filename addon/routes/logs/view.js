import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class LogsViewRoute extends Route {
    @service store;
    @service abilities;
    @service notifications;
    @service hostRouter;
    @service intl;

    beforeModel() {
        if (this.abilities.cannot('developers view log')) {
            this.notifications.warning(this.intl.t('common.unauthorized-access'));
            return this.hostRouter.transitionTo('console.developers.logs.index');
        }
    }

    model({ public_id }) {
        return this.store.findRecord('api-request-log', public_id);
    }
}
