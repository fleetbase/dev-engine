import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

const COLORS = [
    ['#3485e2', 'rgba(52, 133, 226, 0.15)'],
    ['#10b981', 'rgba(16, 185, 129, 0.15)'],
    ['#ef4444', 'rgba(239, 68, 68, 0.15)'],
    ['#f59e0b', 'rgba(245, 158, 11, 0.15)'],
];

export default class WidgetDevelopersChartComponent extends Component {
    @service developerMetrics;
    @service intl;

    @tracked data = null;
    @tracked error = null;

    constructor() {
        super(...arguments);
        this.load.perform();
    }

    get period() {
        return this.developerMetrics.period;
    }

    get labels() {
        return this.data?.labels ?? [];
    }

    get datasets() {
        return (this.data?.datasets ?? []).map((dataset, index) => {
            const color = COLORS[index % COLORS.length];

            return {
                ...dataset,
                borderColor: color[0],
                backgroundColor: color[1],
                borderWidth: 2,
                fill: true,
                tension: 0.35,
                pointRadius: 0,
                pointHoverRadius: 4,
            };
        });
    }

    get isEmpty() {
        return !this.datasets.some((dataset) => (dataset.data ?? []).some((value) => Number(value) > 0));
    }

    /**
     * The summary line under the chart: top methods for api-traffic, the
     * delivery summary for webhook-delivery.
     */
    get summaryText() {
        const { data } = this;

        if (!data) {
            return null;
        }

        if (Array.isArray(data.methods) && data.methods.length) {
            const total = data.methods.reduce((sum, item) => sum + Number(item.value ?? 0), 0) || 1;

            return data.methods
                .slice(0, 4)
                .map((item) => `${item.label} ${Math.round((Number(item.value ?? 0) / total) * 100)}%`)
                .join(' · ');
        }

        if (data.summary) {
            const { sent, succeeded, failed, average_attempts, average_duration_ms } = data.summary;

            return this.intl.t('developers.dashboard.webhook-summary', {
                sent: Number(sent ?? 0).toLocaleString(),
                succeeded: Number(succeeded ?? 0).toLocaleString(),
                failed: Number(failed ?? 0).toLocaleString(),
                attempts: average_attempts ?? 0,
                duration: Math.round(average_duration_ms ?? 0),
            });
        }

        return null;
    }

    get chartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: { usePointStyle: true, boxWidth: 6, boxHeight: 6, font: { size: 10 } },
                },
            },
            scales: {
                x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8, font: { size: 10 } } },
                y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.16)' }, ticks: { font: { size: 10 } } },
            },
        };
    }

    @task({ restartable: true }) *load() {
        try {
            this.data = yield this.developerMetrics.fetchForPeriod(this.args.endpoint);
            this.error = null;
        } catch (error) {
            this.error = error?.message ?? 'Unable to load chart';
        }
    }

    @action refresh() {
        this.load.perform();
    }
}
