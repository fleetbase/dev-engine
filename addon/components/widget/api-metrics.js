import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, computed } from '@ember/object';
import { startOfDay, sub } from 'date-fns';
import makeDataset from '@fleetbase/ember-core/utils/make-dataset';

export default class WidgetApiMetricsComponent extends Component {
    @service store;
    @tracked chartDateEnd = new Date();
    @tracked chartDateStart = startOfDay(sub(new Date(), { days: 7 }));
    @tracked chartOptions = {
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
                    unit: 'hour',
                    displayFormats: {
                        minute: 'HH:mm',
                    },
                    tooltipFormat: 'HH:mm',
                },
                ticks: {
                    major: {
                        enabled: true,
                    },
                },
            },
        },
    };

    @computed('chartDateStart', 'chartDateEnd') get chartLabels() {
        return [this.chartDateStart.toLocaleString(), this.chartDateEnd.toLocaleString()];
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
                    const successResponses = makeDataset(apiRequestLogs, (req) => req.status_code.startsWith(2));
                    const errorResponses = makeDataset(apiRequestLogs, (req) => !req.status_code.startsWith(2));

                    datasets.pushObject({
                        label: 'success',
                        data: successResponses,
                        backgroundColor: ['rgba(16, 185, 129, 0.2)'],
                        borderColor: ['rgba(16, 185, 129, 0.2)'],
                        borderWidth: 1,
                    });

                    datasets.pushObject({
                        label: 'error',
                        data: errorResponses,
                        backgroundColor: ['rgba(239, 68, 68, 0.2)'],
                        borderColor: ['rgba(239, 68, 68, 0.2)'],
                        borderWidth: 1,
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
                        label: 'GET Error',
                        data: getErrorResponses,
                        backgroundColor: ['#F87171'],
                        borderColor: ['#F87171'],
                        borderWidth: 1,
                    });

                    datasets.pushObject({
                        label: 'POST Error',
                        data: postErrorResponses,
                        backgroundColor: ['#EF4444'],
                        borderColor: ['#EF4444'],
                        borderWidth: 1,
                    });

                    datasets.pushObject({
                        label: 'PUT Error',
                        data: putErrorResponses,
                        backgroundColor: ['#DC2626'],
                        borderColor: ['#DC2626'],
                        borderWidth: 1,
                    });

                    datasets.pushObject({
                        label: 'DELETE Error',
                        data: deleteErrorResponses,
                        backgroundColor: ['#B91C1C'],
                        borderColor: ['#B91C1C'],
                        borderWidth: 1,
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
                    const successResponses = makeDataset(webhookRequestLogs, (req) => req.status_code.startsWith(2));
                    const errorResponses = makeDataset(webhookRequestLogs, (req) => !req.status_code.startsWith(2));

                    datasets.pushObject({
                        label: 'success',
                        data: successResponses,
                        backgroundColor: ['rgba(16, 185, 129, 0.2)'],
                        borderColor: ['rgba(16, 185, 129, 0.2)'],
                        borderWidth: 1,
                    });

                    datasets.pushObject({
                        label: 'error',
                        data: errorResponses,
                        backgroundColor: ['rgba(239, 68, 68, 0.2)'],
                        borderColor: ['rgba(239, 68, 68, 0.2)'],
                        borderWidth: 1,
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
                    const data = webhookRequestLogs.map((req) => ({
                        t: new Date(req.created_at),
                        y: req.duration,
                        x: 1,
                    }));

                    datasets.pushObject({
                        label: 'Duration (ms)',
                        data,
                        backgroundColor: ['rgba(16, 185, 129, 0.2)'],
                        borderColor: ['rgba(16, 185, 129, 0.2)'],
                        borderWidth: 1,
                    });

                    return resolve(datasets);
                })
                .catch(() => {
                    resolve(datasets);
                });
        });
    }
}
