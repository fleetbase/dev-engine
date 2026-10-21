import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

/**
 * The first-integration state of the dashboard: three ordered steps that
 * get data flowing. Shown while the organization has no requests and no keys.
 */
export default class DashboardOnboardingComponent extends Component {
    @service apiKeyActions;
    @service webhookActions;
    @service hostRouter;
    @service currentUser;

    get isSandbox() {
        return this.currentUser.getOption('sandbox', false) === true;
    }

    @action createApiKey() {
        return this.apiKeyActions.createApiKey();
    }

    @action createWebhook() {
        return this.webhookActions.createWebhook();
    }

    @action go(route) {
        return this.hostRouter.transitionTo(`console.developers.${route}`);
    }
}
