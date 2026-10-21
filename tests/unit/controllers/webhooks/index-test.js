import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';
import { settled } from '@ember/test-helpers';
import Service from '@ember/service';

class FetchStub extends Service {
    get() {
        return Promise.resolve([]);
    }
}

class StoreStub extends Service {
    query() {
        return Promise.resolve([]);
    }

    peekAll() {
        return [];
    }
}

module('Unit | Controller | webhooks/index', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:fetch', FetchStub);
        this.owner.unregister('service:store');
        this.owner.register('service:store', StoreStub);
    });

    test('it exists', async function (assert) {
        let controller = this.owner.lookup('controller:webhooks/index');
        assert.ok(controller);
        await settled();
    });
});
