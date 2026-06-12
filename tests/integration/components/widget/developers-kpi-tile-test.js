import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import Service from '@ember/service';
import { hbs } from 'ember-cli-htmlbars';

class FetchStub extends Service {
    get() {
        return Promise.resolve({
            metrics: {
                api_requests: {
                    label: 'API Requests',
                    value: 42,
                    format: 'count',
                    delta_percent: 12,
                },
            },
        });
    }
}

module('Integration | Component | widget/developers-kpi-tile', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:fetch', FetchStub);
    });

    test('it renders a dashboard KPI metric', async function (assert) {
        await render(hbs`<Widget::DevelopersKpiTile @metric="api_requests" @title="API Requests" @icon="code" />`);

        assert.dom('.developers-kpi-tile').exists();
        assert.dom('.developers-kpi-label').hasText('API Requests');
        assert.dom('.developers-kpi-value').hasText('42');
    });
});
