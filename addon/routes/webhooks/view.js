import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class WebhooksViewRoute extends Route {
    @service store;

    model({ id }) {
        return this.store.findRecord('webhook-endpoint', id);
    }
}
