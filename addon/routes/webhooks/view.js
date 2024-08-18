import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class WebhooksViewRoute extends Route {
    @service store;
    @service abilities;
    @service notifications;
    @service hostRouter;
    @service intl;

    beforeModel () {
        if (this.abilities.cannot('developers view webhook')) {
            this.notifications.warning(this.intl.t('common.unauthorized-access'));
            return this.hostRouter.transitionTo('console.developers.webhooks.index');
        }
    }

    model({ id }) {
        return this.store.findRecord('webhook-endpoint', id);
    }
}
