import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, computed } from '@ember/object';
import { startOfDay, sub } from 'date-fns';
import makeDataset from '@fleetbase/ember-core/utils/make-dataset';

export default class WidgetApiMetricsComponent extends Component {
    @service store;
    @service intl;
    @tracked chartDateEnd = new Date();
    @tracked chartDateStart = startOfDay(sub(new Date(), { days: 7 }));
    @tracked chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        transitions: {
            show: {
                animations: {
                    x: {
                        from: 0,
                    },
                    y: {
                        from: 0,
                    },
                },
            },
            hide: {
                animations: {
                    x: {
                        to: 0,
                    },
                    y: {
                        to: 0,
                    },
                },
            },
        },
        layout: {
            padding: 10,
        },
        plugins: {
            legend: {
                labels: {
                    color: '#fff',
                },
            },
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'day',
                    displayFormats: {
                        day: 'MMM d',
                    },
                    tooltipFormat: 'MMM d, yyyy',
                },
                ticks: {
                    major: {
                        enabled: true,
                    },
                },
            },
            y: {
                beginAtZero: true,
            },
        },
    };

    @computed('chartDateStart', 'chartDateEnd') get chartLabels() {
        return [this.chartDateStart.toLocaleString(), this.chartDateEnd.toLocaleString()];
    }

    /**
     * Transform makeDataset output from { t, y } to { x, y } format for Chart.js
     */
    transformDataset(dataset) {
        return dataset.map(point => ({
            x: point.t,  // Rename 't' to 'x'
            y: point.y
        }));
    }

    @action apiRequestData() {
        return new Promise((resolve) => {
            const datasets = [];

            return this.store
                .query('api-request-log', {
                    columns: ['uuid', 'status_code', 'created_at'],
                    after: this.chartDateStart.toISOString(),
                })
                .then((apiRequestLogs) => {
                    // Convert string status_code to number before comparison
                    const successResponses = makeDataset(apiRequestLogs, (req) => {
                        const statusCode = parseInt(req.status_code, 10);
                        return statusCode >= 200 && statusCode < 300;
                    });
                    
                    const errorResponses = makeDataset(apiRequestLogs, (req) => {
                        const statusCode = parseInt(req.status_code, 10);
                        return statusCode < 200 || statusCode >= 300;
                    });

                    datasets.pushObject({
                        label: this.intl.t('developers.component.widget.api-metrics.success-label'),
                        data: this.transformDataset(successResponses),  // Transform here!
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        borderColor: 'rgba(16, 185, 129, 1)',
                        borderWidth: 2,
                        fill: true,
                    });

                    datasets.pushObject({
                        label: this.intl.t('developers.component.widget.api-metrics.error-label'),
                        data: this.transformDataset(errorResponses),  // Transform here!
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        borderColor: 'rgba(239, 68, 68, 1)',
                        borderWidth: 2,
                        fill: true,
                    });

                    return resolve(datasets);
                })
                .catch(() => {
                    resolve(datasets);
                });
        });
    }

    @action apiErrorDistributionData() {
        return new Promise((resolve) => {
            const datasets = [];

            return this.store
                .query('api-request-log', {
                    columns: ['uuid', 'status_code', 'method', 'created_at'],
                    status_code: '!200',
                    after: this.chartDateStart.toISOString(),
                })
                .then((apiRequestLogs) => {
                    const getErrorResponses = makeDataset(apiRequestLogs, (req) => req.method === 'GET');
                    const postErrorResponses = makeDataset(apiRequestLogs, (req) => req.method === 'POST');
                    const putErrorResponses = makeDataset(apiRequestLogs, (req) => req.method === 'PUT');
                    const deleteErrorResponses = makeDataset(apiRequestLogs, (req) => req.method === 'DELETE');

                    datasets.pushObject({
                        label: this.intl.t('developers.component.widget.api-metrics.get-error'),
                        data: this.transformDataset(getErrorResponses),
                        backgroundColor: '#F87171',
                        borderColor: '#F87171',
                        borderWidth: 2,
                    });

                    datasets.pushObject({
                        label: this.intl.t('developers.component.widget.api-metrics.post-error'),
                        data: this.transformDataset(postErrorResponses),
                        backgroundColor: '#EF4444',
                        borderColor: '#EF4444',
                        borderWidth: 2,
                    });

                    datasets.pushObject({
                        label: this.intl.t('developers.component.widget.api-metrics.put-error'),
                        data: this.transformDataset(putErrorResponses),
                        backgroundColor: '#DC2626',
                        borderColor: '#DC2626',
                        borderWidth: 2,
                    });

                    datasets.pushObject({
                        label: this.intl.t('developers.component.widget.api-metrics.delete-error'),
                        data: this.transformDataset(deleteErrorResponses),
                        backgroundColor: '#B91C1C',
                        borderColor: '#B91C1C',
                        borderWidth: 2,
                    });

                    return resolve(datasets);
                })
                .catch(() => {
                    resolve(datasets);
                });
        });
    }

    @action webhookRequestData() {
        return new Promise((resolve) => {
            const datasets = [];

            return this.store
                .query('webhook-request-log', {
                    columns: ['uuid', 'status_code', 'created_at'],
                    after: this.chartDateStart.toISOString(),
                })
                .then((webhookRequestLogs) => {
                    // Convert string status_code to number before comparison
                    const successResponses = makeDataset(webhookRequestLogs, (req) => {
                        const statusCode = parseInt(req.status_code, 10);
                        return statusCode >= 200 && statusCode < 300;
                    });
                    
                    const errorResponses = makeDataset(webhookRequestLogs, (req) => {
                        const statusCode = parseInt(req.status_code, 10);
                        return statusCode < 200 || statusCode >= 300;
                    });

                    datasets.pushObject({
                        label: this.intl.t('developers.component.widget.api-metrics.success-label'),
                        data: this.transformDataset(successResponses),
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        borderColor: 'rgba(16, 185, 129, 1)',
                        borderWidth: 2,
                        fill: true,
                    });

                    datasets.pushObject({
                        label: this.intl.t('developers.component.widget.api-metrics.error-label'),
                        data: this.transformDataset(errorResponses),
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        borderColor: 'rgba(239, 68, 68, 1)',
                        borderWidth: 2,
                        fill: true,
                    });

                    return resolve(datasets);
                })
                .catch(() => {
                    resolve(datasets);
                });
        });
    }

    @action webhookRequestTimingData() {
        return new Promise((resolve) => {
            const datasets = [];

            return this.store
                .query('webhook-request-log', {
                    columns: ['uuid', 'status_code', 'created_at', 'duration'],
                    after: this.chartDateStart.toISOString(),
                })
                .then((webhookRequestLogs) => {
                    // For timing data, we already create the correct format
                    const data = webhookRequestLogs.map((req) => ({
                        x: new Date(req.created_at),  // Use 'x' not 't'
                        y: req.duration,
                    }));

                    datasets.pushObject({
                        label: this.intl.t('developers.component.widget.api-metrics.duration-ms'),
                        data,
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        borderColor: 'rgba(16, 185, 129, 1)',
                        borderWidth: 2,
                        fill: true,
                    });

                    return resolve(datasets);
                })
                .catch(() => {
                    resolve(datasets);
                });
        });
    }
}
