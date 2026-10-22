import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

/**
 * Channel tab: the key's own socket channel and what this browser has seen on it.
 */
export default class ApiKeyTabsChannelComponent extends Component {
    @service socketChannels;
    @service hostRouter;

    get apiKey() {
        return this.args.resource ?? this.args.model;
    }

    get channelName() {
        return `api.${this.apiKey?.id}`;
    }

    get state() {
        return this.socketChannels.stateFor(this.channelName);
    }

    @action watch() {
        this.args.close?.();
        return this.hostRouter.transitionTo('console.developers.sockets.view', this.channelName);
    }
}
