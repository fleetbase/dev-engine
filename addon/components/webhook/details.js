import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class WebhookDetailsComponent extends Component {
    @action onClickUpdateWebhook() {
        const { webhook, onClickUpdateWebhook } = this.args;

        if (typeof onClickUpdateWebhook === 'function') {
            onClickUpdateWebhook(webhook);
        }
    }
}
