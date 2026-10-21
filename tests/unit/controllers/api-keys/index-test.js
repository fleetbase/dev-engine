import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';

class IntlStub {
    static create(props) {
        return Object.assign(new this(), props);
    }

    t(key) {
        return key;
    }
}

class CurrentUserStub {
    static create(props) {
        return Object.assign(new this(), props);
    }

    options = {};
    user = {};

    getOption(key, defaultValue = null) {
        return key in this.options ? this.options[key] : defaultValue;
    }

    setOption(key, value) {
        this.options[key] = value;
    }
}

class AbilitiesStub {
    static create(props) {
        return Object.assign(new this(), props);
    }

    cannot() {
        return false;
    }
}

class StoreStub {
    static create(props) {
        return Object.assign(new this(), props);
    }

    record = { id: 'api_key_uuid', name: 'Live API Key' };
    findRequests = [];

    peekRecord() {
        return null;
    }

    findRecord(modelName, id) {
        this.findRequests.push({ modelName, id });
        return Promise.resolve(this.record);
    }
}

class HostRouterStub {
    static create(props) {
        return Object.assign(new this(), props);
    }

    transitions = [];

    transitionTo(...args) {
        this.transitions.push(args);
        return Promise.resolve();
    }

    refresh() {
        return Promise.resolve();
    }
}

class ModalsManagerStub {
    static create(props) {
        return Object.assign(new this(), props);
    }

    show() {}
    confirm() {}
}

class NotificationsStub {
    static create(props) {
        return Object.assign(new this(), props);
    }

    warnings = [];

    warning(message) {
        this.warnings.push(message);
    }

    serverError() {}
    success() {}
}

class EmptyServiceStub {
    static create(props) {
        return Object.assign(new this(), props);
    }
}

module('Unit | Controller | api-keys/index', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:intl', IntlStub);
        this.owner.register('service:current-user', CurrentUserStub);
        this.owner.register('service:abilities', AbilitiesStub);
        this.owner.register('service:store', StoreStub);
        this.owner.register('service:host-router', HostRouterStub);
        this.owner.register('service:modals-manager', ModalsManagerStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:crud', EmptyServiceStub);
        this.owner.register('service:fetch', EmptyServiceStub);
        this.owner.register('service:theme', EmptyServiceStub);
        this.owner.register('service:universe', EmptyServiceStub);
    });

    test('it exists', function (assert) {
        let controller = this.owner.lookup('controller:api-keys/index');
        assert.ok(controller);
    });

    test('it opens a deep-linked API key in the existing edit modal', async function (assert) {
        const controller = this.owner.lookup('controller:api-keys/index');
        const store = this.owner.lookup('service:store');

        controller.view_api_key = 'api_key_uuid';
        controller.editApiKey = (apiKey, options) => {
            assert.strictEqual(apiKey, store.record);
            assert.strictEqual(typeof options.onDecline, 'function');
            assert.strictEqual(typeof options.onFinish, 'function');
        };

        await controller.openDeepLinkedApiKey();

        assert.deepEqual(store.findRequests, [{ modelName: 'api-credential', id: 'api_key_uuid' }]);
    });

    test('it clears only the API key deep-link query param', function (assert) {
        const controller = this.owner.lookup('controller:api-keys/index');
        const hostRouter = this.owner.lookup('service:host-router');

        controller.query = 'live';
        controller.view_api_key = 'api_key_uuid';

        controller.clearDeepLinkedApiKey();

        assert.strictEqual(controller.view_api_key, null);
        assert.strictEqual(controller.query, 'live', 'table query is preserved');
        assert.deepEqual(hostRouter.transitions, [[{ queryParams: { view_api_key: null } }]]);
    });
});
