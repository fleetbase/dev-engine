import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

/**
 * The Live / Test environment switch. Binds to the console's `sandbox` user
 * option, which the fetch service turns into the `Access-Console-Sandbox`
 * header, so every list under it re-queries against the right database.
 *
 * Replaces the "View test data" toggle plus key select: switching used to leave
 * the list empty until the route was re-entered because the toggle refreshed
 * before the option was applied and stored a key string where an id was read.
 */
export default class EnvironmentSwitchComponent extends Component {
    @service currentUser;
    @service theme;
    @service store;
    @service hostRouter;

    get isSandbox() {
        return this.currentUser.getOption('sandbox', false) === true;
    }

    @action setEnvironment(sandbox) {
        if (sandbox === this.isSandbox) {
            return;
        }

        this.currentUser.setOption('sandbox', sandbox);
        // The old key-scoped sandbox filter stored a key string where an id was expected; drop it.
        this.currentUser.setOption('testKey', null);
        this.theme.setEnvironment();
        this.store.unloadAll();

        if (typeof this.args.onChange === 'function') {
            this.args.onChange(sandbox);
        }

        return this.hostRouter.refresh();
    }
}
