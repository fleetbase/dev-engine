import BaseController from '../base-controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class LogsViewController extends BaseController {
    @service intl;
    @service hostRouter;

    /**
     * Header buttons. Extensions add to them through `developers:log:details`.
     */
    get actionButtons() {
        return this.detailsActionButtons('log', this.model, []);
    }

    @action goBack() {
        return this.hostRouter.transitionTo('console.developers.logs.index');
    }
}
