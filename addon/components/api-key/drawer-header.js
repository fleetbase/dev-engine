import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

/**
 * Drawer header for an API key: identity block, header actions, open full page, close.
 * Rendered by the resource context panel in place of its default header.
 */
export default class ApiKeyDrawerHeaderComponent extends Component {
    @service developerPanels;

    get apiKey() {
        return this.args.resource ?? this.args.model;
    }

    get isExpired() {
        const expiresAt = this.apiKey?.expires_at;

        return expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;
    }

    get tone() {
        if (this.isExpired) {
            return 'is-red';
        }

        return this.apiKey?.test_mode ? 'is-amber' : 'is-green';
    }

    get environment() {
        if (this.isExpired) {
            return { status: 'danger', key: 'developers.api-keys.badges.expired' };
        }

        return this.apiKey?.test_mode ? { status: 'warning', key: 'developers.common.test' } : { status: 'success', key: 'developers.common.live' };
    }

    @action openFullPage() {
        return this.developerPanels.openFullPage('api-keys.index', { queryParams: { view_api_key: this.apiKey.id } });
    }
}
