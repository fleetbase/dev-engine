import { module, test } from 'qunit';
import parseRequestQuery from '@fleetbase/dev-engine/utils/parse-request-query';

module('Unit | Utility | parse-request-query', function () {
    test('it maps tokens to filter params and keeps the free text', function (assert) {
        const result = parseRequestQuery('orders status:5xx method:post duration>1000 ip:203.0.113.42');

        assert.strictEqual(result.query, 'orders');
        assert.deepEqual(result.params, { status_code_gte: 500, status_code_lt: 600, method: 'POST', duration_gte: 1, ip_address: '203.0.113.42' });
    });

    test('unknown tokens and plain text stay in the query', function (assert) {
        const result = parseRequestQuery('socket/token foo:bar status:abc');

        assert.strictEqual(result.query, 'socket/token foo:bar status:abc');
        assert.deepEqual(result.params, {});
    });
});
