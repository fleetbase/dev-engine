import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';

class IntlStub {
    t(key, params) {
        return params ? `${key} ${JSON.stringify(params)}` : key;
    }
}

class HostRouterStub {
    handlers = {};

    on(eventName, handler) {
        this.handlers[eventName] = handler;
    }

    one(eventName, handler) {
        this.handlers[eventName] = handler;
    }

    transitionTo() {}
}

class CurrentUserStub {
    options = {};

    getOption(key, defaultValue = null) {
        return key in this.options ? this.options[key] : defaultValue;
    }

    setOption(key, value) {
        this.options[key] = value;
    }
}

class EmptyServiceStub {}

// An async-iterable event stream a test can push into.
function eventStream() {
    const queue = [];
    const waiting = [];

    return {
        push(value) {
            if (waiting.length) {
                waiting.shift()({ done: false, value });
            } else {
                queue.push(value);
            }
        },
        close() {
            while (waiting.length) {
                waiting.shift()({ done: true, value: undefined });
            }
        },
        [Symbol.asyncIterator]() {
            return {
                next: () => (queue.length ? Promise.resolve({ done: false, value: queue.shift() }) : new Promise((resolve) => waiting.push(resolve))),
            };
        },
    };
}

function fakeChannel() {
    const listeners = {};
    const data = eventStream();

    return {
        closed: false,
        listener(eventName) {
            listeners[eventName] = listeners[eventName] || eventStream();
            return listeners[eventName];
        },
        emit(eventName, value) {
            this.listener(eventName).push(value);
        },
        publish(value) {
            data.push(value);
        },
        close() {
            this.closed = true;
            Object.values(listeners).forEach((stream) => stream.close());
            data.close();
        },
        [Symbol.asyncIterator]() {
            return data[Symbol.asyncIterator]();
        },
    };
}

// Stands in for the ember-core socket service: `instance()` returns a client
// whose subscribe hands back the test's channel.
class SocketStub {
    channel = null;
    subscribed = [];
    clientListeners = {};

    instance() {
        return {
            options: { hostname: 'socket.test' },
            listener: (eventName) => {
                this.clientListeners[eventName] = this.clientListeners[eventName] || eventStream();
                return this.clientListeners[eventName];
            },
            subscribe: (name) => {
                this.subscribed.push(name);
                return this.channel;
            },
        };
    }
}

function authError(reason) {
    const error = new Error(`Subscription to channel denied: ${reason}`);
    error.name = 'AuthError';
    error.reason = reason;
    return error;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

module('Unit | Controller | sockets/view', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:intl', IntlStub);
        this.owner.register('service:host-router', HostRouterStub);
        this.owner.register('service:socket', SocketStub);
        this.owner.register('service:current-user', CurrentUserStub);
        this.owner.register('service:universe', EmptyServiceStub);
        this.owner.register('service:notifications', EmptyServiceStub);
        this.owner.register('service:developer-panels', EmptyServiceStub);

        this.controller = this.owner.lookup('controller:sockets/view');
        this.controller.model = { name: 'order.abc' };
        this.channel = fakeChannel();
        this.socket = this.owner.lookup('service:socket');
        this.socket.channel = this.channel;
    });

    test('it exists', function (assert) {
        assert.ok(this.controller);
    });

    test('an authorization refusal is shown with its reason', function (assert) {
        const message = this.controller.describeSubscribeFailure('order.abc', authError('forbidden'));

        assert.true(message.startsWith('developers.sockets.view.socket-subscribe-denied'));
        assert.true(message.includes('"reason":"forbidden"'));
    });

    test('any other refusal is shown with its message', function (assert) {
        const message = this.controller.describeSubscribeFailure('order.abc', new Error('Socket hung up'));

        assert.true(message.startsWith('developers.sockets.view.socket-subscribe-failed'));
        assert.true(message.includes('Socket hung up'));
    });

    test('a refused subscription becomes the denied state and records the access decision', async function (assert) {
        this.controller.watchSocket({ name: 'order.abc' });
        assert.deepEqual(this.socket.subscribed, ['order.abc']);

        this.channel.emit('subscribeFail', { error: authError('forbidden') });
        await flush();

        assert.strictEqual(this.controller.connection, 'denied');
        assert.strictEqual(this.controller.reason, 'forbidden');
        assert.true(this.controller.isDenied);
        assert.strictEqual(this.controller.messages.length, 1);
        assert.strictEqual(this.controller.messages[0].kind, 'error');
        assert.strictEqual(this.owner.lookup('service:socket-channels').stateFor('order.abc').access, 'denied');
    });

    test('a no_token refusal is recognised', async function (assert) {
        this.controller.watchSocket({ name: 'order.abc' });
        this.channel.emit('subscribeFail', { error: authError('no_token') });
        await flush();

        assert.true(this.controller.isNoToken);
    });

    test('a kick-out is logged and a later resubscribe restores the subscribed state', async function (assert) {
        this.controller.watchSocket({ name: 'order.abc' });

        this.channel.emit('kickOut', { message: 'token_expired' });
        await flush();
        assert.strictEqual(this.controller.connection, 'kicked');

        this.channel.emit('subscribe', {});
        await flush();

        assert.strictEqual(this.controller.connection, 'subscribed');
        assert.deepEqual(
            this.controller.messages.map((message) => message.event),
            ['kickOut', 'subscribe']
        );
    });

    test('channel data is kept with its event name and counted', async function (assert) {
        this.controller.watchSocket({ name: 'order.abc' });

        this.channel.publish({ event: 'order.updated', data: { id: 'order_1' } });
        await flush();

        assert.strictEqual(this.controller.dataCount, 1);
        assert.strictEqual(this.controller.messages[0].event, 'order.updated');
        assert.strictEqual(this.controller.messages[0].resourceId, 'order_1');
        assert.strictEqual(this.owner.lookup('service:socket-channels').stateFor('order.abc').messageCount, 1);
    });

    test('pausing buffers messages until resumed', async function (assert) {
        this.controller.watchSocket({ name: 'order.abc' });
        this.controller.togglePause();

        this.channel.publish({ event: 'order.updated' });
        await flush();

        assert.strictEqual(this.controller.messages.length, 0);
        assert.strictEqual(this.controller.buffered.length, 1);

        this.controller.togglePause();
        assert.strictEqual(this.controller.messages.length, 1);
        assert.strictEqual(this.controller.buffered.length, 0);
    });

    test('type and text filters hide messages without dropping them', async function (assert) {
        this.controller.watchSocket({ name: 'order.abc' });
        this.channel.publish({ event: 'order.updated' });
        this.channel.publish({ event: 'driver.updated' });
        await flush();

        this.controller.setQuery({ target: { value: 'driver' } });
        assert.strictEqual(this.controller.visibleMessages.length, 1);
        assert.strictEqual(this.controller.hiddenCount, 1);

        this.controller.clearFilters();
        this.controller.toggleKind('data');
        assert.strictEqual(this.controller.visibleMessages.length, 0);
        assert.strictEqual(this.controller.messages.length, 2);
    });

    test('leaving the page closes the channel', async function (assert) {
        this.controller.watchSocket({ name: 'order.abc' });
        this.channel.emit('subscribe', {});
        await flush();

        this.owner.lookup('service:host-router').handlers.routeWillChange();

        assert.true(this.channel.closed);
        assert.strictEqual(this.controller.connection, 'closed');
        assert.false(this.owner.lookup('service:socket-channels').stateFor('order.abc').watching);
    });
});
