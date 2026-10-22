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

    getOption(key, defaultValue = null) {
        return key in this.options ? this.options[key] : defaultValue;
    }

    setOption(key, value) {
        this.options[key] = value;
    }
}

module('Unit | Service | socket-channels', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:intl', IntlStub);
        this.owner.register('service:current-user', CurrentUserStub);
    });

    test('custom channels are remembered and forgotten', function (assert) {
        const service = this.owner.lookup('service:socket-channels');

        service.rememberChannel('driver.driver_1');
        service.rememberChannel('driver.driver_1');
        service.rememberChannel('chat_channel.chat_1 ');

        assert.deepEqual(service.customChannels, ['driver.driver_1', 'chat_channel.chat_1']);

        service.forgetChannel('driver.driver_1');
        assert.deepEqual(service.customChannels, ['chat_channel.chat_1']);
    });

    test('channel names are validated like the socket server does', function (assert) {
        const service = this.owner.lookup('service:socket-channels');

        assert.strictEqual(service.validateName('company.abc'), null);
        assert.strictEqual(service.validateName(''), 'developers.sockets.listen.error-empty');
        assert.strictEqual(service.validateName('has space'), 'developers.sockets.listen.error-whitespace');
        assert.strictEqual(service.validateName('x'.repeat(256)), 'developers.sockets.listen.error-length');
    });

    test('channel type comes from the prefix and state is tracked per channel', function (assert) {
        const service = this.owner.lookup('service:socket-channels');

        assert.strictEqual(service.typeOf('company.abc'), 'company');
        assert.strictEqual(service.typeOf('api.abc'), 'api');
        assert.strictEqual(service.typeOf('driver.abc'), 'custom');

        service.update('api.abc', { access: 'allowed' });
        service.recordMessage('api.abc', 'order.updated');
        service.recordMessage('api.abc', 'order.completed');

        const state = service.stateFor('api.abc');
        assert.strictEqual(state.access, 'allowed');
        assert.strictEqual(state.messageCount, 2);
        assert.strictEqual(state.lastEvent, 'order.completed');
    });
});
