import { module, test } from 'qunit';
import { maskKey, formatMs, formatSeconds, shortUrl, statusClass, statusTone, byteSize } from '@fleetbase/dev-engine/utils/format';

module('Unit | Utility | format', function () {
    test('maskKey keeps the environment prefix and the ends of the key', function (assert) {
        assert.strictEqual(maskKey('flb_live_z2c4wXmikX0ykDUpzWfR'), 'flb_live_z2c4…pzWfR');
        assert.strictEqual(maskKey('flb_test_abcdefghijklmnop'), 'flb_test_abcd…lmnop');
        assert.strictEqual(maskKey('short'), 'short');
        assert.strictEqual(maskKey(null), null);
    });

    test('durations format in ms and seconds', function (assert) {
        assert.strictEqual(formatMs(184), '184 ms');
        assert.strictEqual(formatMs(2418), '2.4 s');
        assert.strictEqual(formatMs(12000), '12 s');
        assert.strictEqual(formatSeconds(0.312), '312 ms');
        assert.strictEqual(formatMs('x'), null);
    });

    test('shortUrl drops the scheme and the trailing slash', function (assert) {
        assert.strictEqual(shortUrl('https://api.acme.com/hooks/fleetbase?x=1'), 'api.acme.com/hooks/fleetbase');
        assert.strictEqual(shortUrl('https://api.acme.com/'), 'api.acme.com');
        assert.strictEqual(shortUrl('not a url'), 'not a url');
    });

    test('status helpers classify HTTP codes', function (assert) {
        assert.strictEqual(statusClass(201), '2xx');
        assert.strictEqual(statusClass('404'), '4xx');
        assert.strictEqual(statusTone(200), 'success');
        assert.strictEqual(statusTone(404), 'warning');
        assert.strictEqual(statusTone(503), 'danger');
        assert.strictEqual(statusTone('abc'), 'info');
    });

    test('byteSize measures strings and objects', function (assert) {
        assert.strictEqual(byteSize('abcd'), '4 B');
        assert.true(byteSize({ a: 'x'.repeat(2000) }).endsWith('KB'));
        assert.strictEqual(byteSize(null), null);
    });
});
