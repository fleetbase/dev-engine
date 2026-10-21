import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isArray } from '@ember/array';

const OPTION_KEY = 'developerChannels';

/**
 * Socket channels the console knows about: the organization channel, one per
 * API key, and custom channels the user asked to watch (remembered in user
 * options). Also keeps the last state seen for each channel in this browser
 * session: access decision, last message, message count, whether a viewer is
 * subscribed.
 *
 * TODO(v2): last activity and subscriber counts from the socket server.
 */
export default class SocketChannelsService extends Service {
    @service currentUser;
    @service intl;

    /** `{ [name]: { access, reason, lastActivityAt, lastEvent, messageCount, watching } }` */
    @tracked state = {};

    get customChannels() {
        const names = this.currentUser.getOption(OPTION_KEY);

        return isArray(names) ? names.filter((name) => typeof name === 'string' && name.trim() !== '') : [];
    }

    @action rememberChannel(name) {
        const names = new Set(this.customChannels);
        names.add(name.trim());
        this.currentUser.setOption(OPTION_KEY, Array.from(names));
    }

    @action forgetChannel(name) {
        this.currentUser.setOption(
            OPTION_KEY,
            this.customChannels.filter((candidate) => candidate !== name)
        );
        const next = { ...this.state };
        delete next[name];
        this.state = next;
    }

    stateFor(name) {
        return this.state[name] ?? {};
    }

    @action update(name, patch) {
        this.state = { ...this.state, [name]: { ...(this.state[name] ?? {}), ...patch } };
    }

    @action recordMessage(name, event) {
        const current = this.state[name] ?? {};

        this.update(name, {
            lastActivityAt: new Date(),
            lastEvent: event ?? current.lastEvent ?? null,
            messageCount: (current.messageCount ?? 0) + 1,
        });
    }

    /**
     * The type of a channel from its prefix.
     */
    typeOf(name) {
        const prefix = String(name ?? '').split('.')[0];

        if (prefix === 'company') {
            return 'company';
        }

        if (prefix === 'api') {
            return 'api';
        }

        return 'custom';
    }

    /**
     * Validates the shape the socket server enforces: non-empty, at most 255
     * characters, no whitespace.
     *
     * @returns {String|null} an error message or null
     */
    validateName(name) {
        const value = String(name ?? '').trim();

        if (value === '') {
            return this.intl.t('developers.sockets.listen.error-empty');
        }

        if (value.length > 255) {
            return this.intl.t('developers.sockets.listen.error-length');
        }

        if (/\s/.test(value)) {
            return this.intl.t('developers.sockets.listen.error-whitespace');
        }

        return null;
    }

    /**
     * The known channel prefixes and who may subscribe, from the core and
     * FleetOps channel resolvers.
     */
    get prefixRules() {
        return [
            { prefix: 'company.<company id>', description: this.intl.t('developers.sockets.rules.company'), access: 'you' },
            { prefix: 'api.<credential uuid>', description: this.intl.t('developers.sockets.rules.api'), access: 'you' },
            { prefix: 'user.<user id>', description: this.intl.t('developers.sockets.rules.user'), access: 'you' },
            { prefix: 'driver.<driver id>', description: this.intl.t('developers.sockets.rules.driver'), access: 'you' },
            { prefix: 'chat_channel.<id>', description: this.intl.t('developers.sockets.rules.chat'), access: 'participants' },
            { prefix: 'test.<id>', description: this.intl.t('developers.sockets.rules.test'), access: 'admins' },
        ];
    }
}
