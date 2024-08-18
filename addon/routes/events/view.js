import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class EventsViewRoute extends Route {
    @service store;
    @service abilities;
    @service notifications;
    @service hostRouter;
    @service intl;

    beforeModel () {
        if (this.abilities.cannot('developers view event')) {
            this.notifications.warning(this.intl.t('common.unauthorized-access'));
            return this.hostRouter.transitionTo('console.developers.events.index');
        }
    }

    model({ public_id }) {
        return this.store.findRecord('api-event', public_id);
    }
}
