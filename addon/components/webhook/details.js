import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class WebhookDetailsComponent extends Component {
    @service abilities;
    @tracked permission;
    @tracked doesntHavePermission = false;

    constructor(owner, { permission }) {
        super(...arguments);
        this.permission = permission;
        this.doesntHavePermission = permission && this.abilities.cannot(permission);
    }

    @action onClickUpdateWebhook() {
        if (this.doesntHavePermission) {
            return;
        }
        
        const { webhook, onClickUpdateWebhook } = this.args;

        if (typeof onClickUpdateWebhook === 'function') {
            onClickUpdateWebhook(webhook);
        }
    }
}
