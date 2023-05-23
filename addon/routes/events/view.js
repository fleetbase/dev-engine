import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class EventsViewRoute extends Route {
    @service store;

    model({ public_id }) {
        return this.store.findRecord('api-event', public_id);
    }
}
