import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const EVENTS = ['order.created', 'order.updated', 'driver.created', 'driver.assigned'];

module('Integration | Component | webhook/event-picker', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('events', EVENTS);
        this.set('selected', ['order.created']);
        this.set('onChange', (next) => this.set('selected', next));
    });

    test('it groups events by prefix and toggles single events', async function (assert) {
        await render(hbs`<Webhook::EventPicker @events={{this.events}} @selected={{this.selected}} @onChange={{this.onChange}} />`);

        assert.dom('.dev-event-group').exists({ count: 2 });
        assert.dom('.dev-event-group:nth-child(1) .dev-event-group-count').hasText('0 / 2');
        assert.dom('.dev-event-group:nth-child(2) .dev-event-group-count').hasText('1 / 2');

        await click('.dev-event-group:nth-child(2) .dev-event-row:nth-of-type(3) input');
        assert.deepEqual(this.selected.slice().sort(), ['order.created', 'order.updated']);
        assert.dom('.dev-tag').exists({ count: 1 });
        assert.dom('.dev-tag').includesText('order.*');
    });

    test('search narrows the list and the all-events toggle clears the selection', async function (assert) {
        await render(hbs`<Webhook::EventPicker @events={{this.events}} @selected={{this.selected}} @onChange={{this.onChange}} />`);

        await fillIn('.dev-event-picker-input', 'driver');
        assert.dom('.dev-event-group').exists({ count: 1 });
        assert.dom('.dev-event-group-name').hasText('driver');

        await click('.dev-event-picker-all [role="checkbox"]');
        assert.deepEqual(this.selected, []);
        assert.dom('.dev-note-warning').exists();
    });
});
