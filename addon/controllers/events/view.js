import BaseController from '../base-controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class EventsViewController extends BaseController {
    @service intl;
    @service hostRouter;

    /**
     * Header buttons. Extensions add to them through `developers:event:details`.
     */
    get actionButtons() {
        return this.detailsActionButtons('event', this.model, []);
    }

    @action goBack() {
        return this.hostRouter.transitionTo('console.developers.events.index');
    }
}
