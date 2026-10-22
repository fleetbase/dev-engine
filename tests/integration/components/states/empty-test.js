import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | states/empty', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a title, a message and an action', async function (assert) {
        this.set('onClick', () => assert.step('clicked'));
        this.set('action', { label: 'Add endpoint', icon: 'plus', onClick: this.onClick });

        await render(hbs`<States::Empty @icon="globe" @title="No endpoints" @message="Add one to receive events." @action={{this.action}} />`);

        assert.dom('.dev-state-title').hasText('No endpoints');
        assert.dom('.dev-state-message').hasText('Add one to receive events.');
        assert.dom('.dev-state-actions .btn').hasText('Add endpoint');

        await click('.dev-state-actions .btn');
        assert.verifySteps(['clicked']);
    });

    test('it yields extra actions', async function (assert) {
        await render(hbs`<States::Empty @title="Nothing"><span class="extra">more</span></States::Empty>`);

        assert.dom('.dev-state-actions .extra').hasText('more');
    });
});
