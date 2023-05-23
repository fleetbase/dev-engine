import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class LogsViewRoute extends Route {
    @service store;

    model({ public_id }) {
        return this.store.findRecord('api-request-log', public_id);
    }
}
