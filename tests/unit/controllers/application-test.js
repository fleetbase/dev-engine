import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';

class IntlStub {
    translations = {
        'developers.application.sidebar.items.home': 'Dashboard',
        'developers.application.sidebar.items.api-keys': 'API Keys',
        'developers.application.sidebar.items.webhooks': 'Webhooks',
        'developers.application.sidebar.items.websockets': 'WebSockets',
        'developers.application.sidebar.items.logs': 'Logs',
        'developers.application.sidebar.items.events': 'Events',
    };

    t(key) {
        return this.translations[key] ?? key;
    }
}

class AbilitiesStub {
    denied = new Set();

    can(permission) {
        return !this.denied.has(permission);
    }
}

class FetchStub {
    requests = [];
    response = {
        results: [
            {
                label: 'Live API Key',
                description: 'flb_live_123',
                icon: 'key',
                type: 'API Key',
                route: 'console.developers.api-keys.index',
                breadcrumb: 'Developers > API Keys',
                queryParams: { query: 'live', view_api_key: 'api_key_uuid' },
            },
        ],
    };

    get(url, params) {
        this.requests.push({ url, params });
        return Promise.resolve(this.response);
    }
}

module('Unit | Controller | application', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:intl', IntlStub);
        this.owner.register('service:abilities', AbilitiesStub);
        this.owner.register('service:fetch', FetchStub);
    });

    test('it builds developer sidebar navigator items with host routes', function (assert) {
        const controller = this.owner.lookup('controller:application');
        const items = controller.navigationItems;

        assert.deepEqual(
            items.map((item) => item.label),
            ['Dashboard', 'API Keys', 'Webhooks', 'WebSockets', 'Logs', 'Events'],
            'root items keep the developer labels'
        );
        assert.deepEqual(
            items.map((item) => item.route),
            ['console.developers.home', 'console.developers.api-keys', 'console.developers.webhooks', 'console.developers.sockets', 'console.developers.logs', 'console.developers.events'],
            'root items keep the console host route names'
        );
        assert.strictEqual(items[1].permission, 'developers list api-key');
        assert.true(items[1].visible, 'api keys item is visible when the see permission is allowed');
    });

    test('it marks developer navigator items hidden when see permissions are denied', function (assert) {
        const abilities = this.owner.lookup('service:abilities');
        abilities.denied.add('developers see webhook');

        const controller = this.owner.lookup('controller:application');
        const webhooks = controller.navigationItems.find((item) => item.route === 'console.developers.webhooks');

        assert.false(webhooks.visible);
    });

    test('it fetches developer resource search results for the sidebar navigator', async function (assert) {
        const controller = this.owner.lookup('controller:application');
        const fetch = this.owner.lookup('service:fetch');
        const results = await controller.searchNavigation({ query: ' live ', limit: 12 });

        assert.deepEqual(fetch.requests, [{ url: 'developers/search', params: { query: 'live', limit: 12 } }], 'calls the developer search endpoint with the trimmed query');
        assert.deepEqual(results, fetch.response.results, 'returns navigator-ready endpoint results');
    });

    test('it does not fetch developer resource search results for blank queries', async function (assert) {
        const controller = this.owner.lookup('controller:application');
        const fetch = this.owner.lookup('service:fetch');
        const results = await controller.searchNavigation({ query: '   ', limit: 12 });

        assert.deepEqual(results, []);
        assert.deepEqual(fetch.requests, [], 'blank queries do not call the adapter');
    });

    test('it returns empty developer search results when the adapter fails', async function (assert) {
        const controller = this.owner.lookup('controller:application');
        const fetch = this.owner.lookup('service:fetch');

        fetch.get = () => Promise.reject(new Error('adapter failed'));

        const results = await controller.searchNavigation({ query: 'live', limit: 12 });

        assert.deepEqual(results, []);
    });
});
