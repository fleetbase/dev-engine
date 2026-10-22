import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';
import { settled } from '@ember/test-helpers';
import Service from '@ember/service';

class FetchStub extends Service {
    get(path) {
        if (path === 'api-request-logs') {
            return Promise.resolve({
                api_request_logs: [
                    { status_code: 200, duration: 0.1, created_at: new Date(Date.now() - 3600000).toISOString() },
                    { status_code: 500, duration: 2.4, created_at: new Date(Date.now() - 3600000).toISOString() },
                    { status_code: 404, duration: 0.05, created_at: new Date(Date.now() - 7200000).toISOString() },
                ],
                meta: { total: 41 },
            });
        }

        return Promise.resolve({ webhook_endpoints: [{ id: 'wh_1', url: 'https://example.com/hooks' }], meta: { total: 1 } });
    }
}

module('Unit | Service | api-key-insights', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:fetch', FetchStub);
    });

    test('it samples a key once and derives totals, error rate, latency and hourly bars', async function (assert) {
        const service = this.owner.lookup('service:api-key-insights');
        const apiKey = { id: 'key_1' };

        const state = service.ensure(apiKey);
        assert.false(state.isLoaded, 'empty until the fetch resolves');

        await settled();

        assert.strictEqual(state.total, 41);
        assert.strictEqual(state.errors, 2);
        assert.strictEqual(state.errorRate, 66.7);
        assert.strictEqual(state.avgMs, 850);
        assert.strictEqual(state.p95Ms, 2400);
        assert.strictEqual(state.webhookTotal, 1);
        assert.strictEqual(state.bars.length, 48, 'one bar per hour of retention');
        assert.strictEqual(state.bars[46].count, 2, 'requests from an hour ago land in the second newest bucket');
        assert.true(state.bars[46].isError, 'a bucket with mostly failures is flagged');
        assert.strictEqual(state.bars[45].count, 1);

        assert.strictEqual(service.ensure(apiKey), state, 'the same state object is reused');
    });
});
