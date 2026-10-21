import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

/**
 * Shows whether the console socket is connected, and to which host.
 */
export default class ChannelConnectionBadgeComponent extends Component {
    @service socket;
    @tracked state = 'connecting';

    constructor() {
        super(...arguments);
        this.observe();
    }

    get host() {
        try {
            return this.socket.instance()?.options?.hostname ?? '';
        } catch {
            return '';
        }
    }

    get badge() {
        return { connected: 'success', connecting: 'warning', disconnected: 'danger' }[this.state] ?? 'info';
    }

    async observe() {
        let instance;

        try {
            instance = this.socket.instance();
        } catch {
            this.state = 'disconnected';
            return;
        }

        if (!instance) {
            this.state = 'disconnected';
            return;
        }

        this.state = instance.state === 'open' ? 'connected' : instance.state === 'closed' ? 'disconnected' : 'connecting';

        (async () => {
            // eslint-disable-next-line no-unused-vars
            for await (const _ of instance.listener('connect')) {
                if (this.isDestroyed) break;
                this.state = 'connected';
            }
        })();

        (async () => {
            // eslint-disable-next-line no-unused-vars
            for await (const _ of instance.listener('close')) {
                if (this.isDestroyed) break;
                this.state = 'disconnected';
            }
        })();

        (async () => {
            // eslint-disable-next-line no-unused-vars
            for await (const _ of instance.listener('connecting')) {
                if (this.isDestroyed) break;
                this.state = 'connecting';
            }
        })();
    }
}
