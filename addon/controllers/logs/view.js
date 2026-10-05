import BaseController from '../base-controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class LogsViewController extends BaseController {
    @service intl;

    /**
     * Header buttons. Extensions add to them through `developers:log:details`.
     *
     * @var {Array}
     */
    get actionButtons() {
        return this.detailsActionButtons('log', this.model, [{ id: 'back', icon: 'long-arrow-left', iconPrefix: 'fas', text: this.intl.t('developers.common.back'), onClick: this.goBack }]);
    }

    @action goBack() {
        return window.history.back();
    }
}
