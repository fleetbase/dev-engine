import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

const COLORS = [
    ['#2563eb', 'rgba(37, 99, 235, 0.15)'],
    ['#10b981', 'rgba(16, 185, 129, 0.15)'],
    ['#ef4444', 'rgba(239, 68, 68, 0.15)'],
    ['#f59e0b', 'rgba(245, 158, 11, 0.15)'],
];

export default class WidgetDevelopersChartComponent extends Component {
    @service fetch;

    @tracked data = null;
    @tracked error = null;

    constructor() {
        super(...arguments);
        this.load.perform();
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

    get chartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8 },
                },
            },
            scales: {
                x: { grid: { display: false }, ticks: { maxRotation: 0 } },
                y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.16)' } },
            },
        };
    }

    @task *load() {
        try {
            this.data = yield this.fetch.get(`metrics/dev/${this.args.endpoint}`, { period: this.args.period ?? '30d' });
            this.error = null;
        } catch (error) {
            this.error = error?.message ?? 'Unable to load chart';
        }
    }

    @action refresh() {
        this.load.perform();
    }
}
