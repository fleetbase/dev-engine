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
        this.owner.register('service:universe', EmptyServiceStub);

        this.controller = this.owner.lookup('controller:sockets/view');
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

    test('an authorization refusal without a reason falls back to the message', function (assert) {
        const error = authError(undefined);
        const message = this.controller.describeSubscribeFailure('order.abc', error);

        assert.true(message.includes(JSON.stringify(error.message).slice(1, -1)));
    });

    test('any other refusal is shown with its message', function (assert) {
        const message = this.controller.describeSubscribeFailure('order.abc', new Error('Socket hung up'));

        assert.true(message.startsWith('developers.sockets.view.socket-subscribe-failed'));
        assert.true(message.includes('Socket hung up'));
        assert.true(this.controller.describeSubscribeFailure('order.abc', null).startsWith('developers.sockets.view.socket-subscribe-failed'));
    });

    test('a refused subscription is logged and stops the awaiting indicator', async function (assert) {
        this.controller.watchSocket({ name: 'order.abc' });
        assert.deepEqual(this.socket.subscribed, ['order.abc']);

        this.channel.emit('subscribeFail', { error: authError('forbidden') });
        await flush();

        assert.true(this.controller.subscriptionFailed);
        assert.false(this.controller.isAwaitingEvents);
        assert.strictEqual(this.controller.events.length, 1);
        assert.strictEqual(this.controller.events[0].color, 'red');
        assert.true(this.controller.events[0].content.startsWith('developers.sockets.view.socket-subscribe-denied'));
    });

    test('a kick-out is logged and a later resubscribe clears the failure', async function (assert) {
        this.controller.watchSocket({ name: 'order.abc' });

        this.channel.emit('subscribeFail', { error: authError('token_expired') });
        this.channel.emit('kickOut', { message: 'token_expired' });
        await flush();
        this.channel.emit('subscribe', {});
        await flush();

        assert.false(this.controller.subscriptionFailed);
        assert.true(this.controller.isAwaitingEvents);
        assert.deepEqual(
            this.controller.events.map((event) => event.content.split(' ')[0]),
            ['developers.sockets.view.socket-subscribe-denied', 'developers.sockets.view.socket-kicked-out', 'developers.sockets.view.socket-subscribed']
        );
    });

    test('channel data is logged as JSON', async function (assert) {
        this.controller.watchSocket({ name: 'order.abc' });

        this.channel.publish({ event: 'order.updated' });
        await flush();

        assert.strictEqual(this.controller.events[0].content, JSON.stringify({ event: 'order.updated' }, undefined, 2));
    });

    test('leaving the page closes the channel and resets the output', async function (assert) {
        this.controller.watchSocket({ name: 'order.abc' });
        this.channel.emit('subscribeFail', { error: authError('forbidden') });
        await flush();

        this.owner.lookup('service:host-router').handlers.routeWillChange();

        assert.true(this.channel.closed);
        assert.deepEqual(this.controller.events, []);
        assert.false(this.controller.subscriptionFailed);
    });
});
