import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { startOfDay, sub, format } from 'date-fns';

export default class WidgetApiMetricsComponent extends Component {
    @service store;
    @service intl;
    
    @tracked chartDateEnd = new Date();
    @tracked chartDateStart = startOfDay(sub(new Date(), { days: 7 }));

    /**
     * Create time-series data from records grouped by hour
     * For sparse data (< 10 records), show individual points instead of grouping
     */
    createTimeSeriesData(records, filterFn = () => true) {
        const filtered = records.filter(filterFn);
        
        // If we have very few records, don't group - show each one
        if (filtered.length < 10) {
            return filtered.map((record) => ({
                x: new Date(record.created_at),
                y: 1,
            }));
        }

        // For larger datasets, group by hour
        const grouped = {};
        filtered.forEach((record) => {
            const timestamp = new Date(record.created_at);
            const hourKey = format(timestamp, 'yyyy-MM-dd HH:00:00');
            
            if (!grouped[hourKey]) {
                grouped[hourKey] = 0;
            }
            grouped[hourKey]++;
        });

        // Convert to Chart.js format
        return Object.keys(grouped)
            .sort()
            .map((key) => ({
                x: new Date(key),
                y: grouped[key],
            }));
    }

    /**
     * API Requests Chart - Success vs Errors
     */
    @action apiRequestData() {
        return new Promise((resolve) => {
            this.store
                .query('api-request-log', {
                    columns: ['uuid', 'status_code', 'created_at'],
                    after: this.chartDateStart.toISOString(),
                })
                .then((apiRequestLogs) => {
                    const records = apiRequestLogs.toArray();

                    const successData = this.createTimeSeriesData(records, (req) => {
                        const statusCode = parseInt(req.status_code, 10);
                        return statusCode >= 200 && statusCode < 300;
                    });

                    const errorData = this.createTimeSeriesData(records, (req) => {
                        const statusCode = parseInt(req.status_code, 10);
                        return statusCode >= 400;
                    });

                    // Show points if we have sparse data
                    const showPoints = records.length < 10;

                    resolve([
                        {
                            label: this.intl.t('developers.component.widget.api-metrics.success-label'),
                            data: successData,
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            borderColor: 'rgb(16, 185, 129)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: showPoints ? 5 : 0,
                            pointBackgroundColor: 'rgb(16, 185, 129)',
                            pointBorderColor: 'rgb(16, 185, 129)',
                            pointBorderWidth: showPoints ? 2 : 0,
                            pointHoverRadius: 7,
                            pointHoverBackgroundColor: 'rgb(16, 185, 129)',
                            pointHoverBorderColor: '#fff',
                            pointHoverBorderWidth: 2,
                        },
                        {
                            label: this.intl.t('developers.component.widget.api-metrics.error-label'),
                            data: errorData,
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            borderColor: 'rgb(239, 68, 68)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: showPoints ? 5 : 0,
                            pointBackgroundColor: 'rgb(239, 68, 68)',
                            pointBorderColor: 'rgb(239, 68, 68)',
                            pointBorderWidth: showPoints ? 2 : 0,
                            pointHoverRadius: 7,
                            pointHoverBackgroundColor: 'rgb(239, 68, 68)',
                            pointHoverBorderColor: '#fff',
                            pointHoverBorderWidth: 2,
                        },
                    ]);
                })
                .catch(() => resolve([]));
        });
    }

    /**
     * API Error Distribution - POST, PUT, DELETE errors only
     */
    @action apiErrorDistributionData() {
        return new Promise((resolve) => {
            this.store
                .query('api-request-log', {
                    columns: ['uuid', 'status_code', 'method', 'created_at'],
                    status_code: '!200',
                    after: this.chartDateStart.toISOString(),
                })
                .then((apiRequestLogs) => {
                    const records = apiRequestLogs.toArray();

                    const postErrors = this.createTimeSeriesData(records, (req) => req.method === 'POST');
                    const putErrors = this.createTimeSeriesData(records, (req) => req.method === 'PUT');
                    const deleteErrors = this.createTimeSeriesData(records, (req) => req.method === 'DELETE');

                    resolve([
                        {
                            label: this.intl.t('developers.component.widget.api-metrics.post-error'),
                            data: postErrors,
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            borderColor: 'rgb(239, 68, 68)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: 'rgb(239, 68, 68)',
                            pointHoverBorderColor: '#fff',
                            pointHoverBorderWidth: 2,
                        },
                        {
                            label: this.intl.t('developers.component.widget.api-metrics.put-error'),
                            data: putErrors,
                            backgroundColor: 'rgba(220, 38, 38, 0.15)',
                            borderColor: 'rgb(220, 38, 38)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: 'rgb(220, 38, 38)',
                            pointHoverBorderColor: '#fff',
                            pointHoverBorderWidth: 2,
                        },
                        {
                            label: this.intl.t('developers.component.widget.api-metrics.delete-error'),
                            data: deleteErrors,
                            backgroundColor: 'rgba(185, 28, 28, 0.15)',
                            borderColor: 'rgb(185, 28, 28)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: 'rgb(185, 28, 28)',
                            pointHoverBorderColor: '#fff',
                            pointHoverBorderWidth: 2,
                        },
                    ]);
                })
                .catch(() => resolve([]));
        });
    }

    /**
     * Webhook Requests - Success vs Errors
     */
    @action webhookRequestData() {
        return new Promise((resolve) => {
            this.store
                .query('webhook-request-log', {
                    columns: ['uuid', 'status_code', 'created_at'],
                    after: this.chartDateStart.toISOString(),
                })
                .then((webhookRequestLogs) => {
                    const records = webhookRequestLogs.toArray();

                    const successData = this.createTimeSeriesData(records, (req) => {
                        const statusCode = parseInt(req.status_code, 10);
                        return statusCode >= 200 && statusCode < 300;
                    });

                    const errorData = this.createTimeSeriesData(records, (req) => {
                        const statusCode = parseInt(req.status_code, 10);
                        return statusCode >= 400;
                    });

                    resolve([
                        {
                            label: this.intl.t('developers.component.widget.api-metrics.success-label'),
                            data: successData,
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            borderColor: 'rgb(59, 130, 246)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: 'rgb(59, 130, 246)',
                            pointHoverBorderColor: '#fff',
                            pointHoverBorderWidth: 2,
                        },
                        {
                            label: this.intl.t('developers.component.widget.api-metrics.error-label'),
                            data: errorData,
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            borderColor: 'rgb(239, 68, 68)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: 'rgb(239, 68, 68)',
                            pointHoverBorderColor: '#fff',
                            pointHoverBorderWidth: 2,
                        },
                    ]);
                })
                .catch(() => resolve([]));
        });
    }

    /**
     * Webhook Response Time
     */
    @action webhookRequestTimingData() {
        return new Promise((resolve) => {
            this.store
                .query('webhook-request-log', {
                    columns: ['uuid', 'created_at', 'duration'],
                    after: this.chartDateStart.toISOString(),
                })
                .then((webhookRequestLogs) => {
                    const records = webhookRequestLogs.toArray();
                    const data = records.map((req) => {
                        // Duration is in seconds, convert to milliseconds
                        const durationMs = parseFloat(req.duration || 0) * 1000;
                        return {
                            x: new Date(req.created_at),
                            y: durationMs,
                        };
                    });

                    // Show points if we have sparse data
                    const showPoints = records.length < 50;

                    resolve([
                        {
                            label: this.intl.t('developers.component.widget.api-metrics.duration-ms'),
                            data,
                            backgroundColor: 'rgba(168, 85, 247, 0.15)',
                            borderColor: 'rgb(168, 85, 247)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: showPoints ? 3 : 0,
                            pointBackgroundColor: 'rgb(168, 85, 247)',
                            pointBorderColor: 'rgb(168, 85, 247)',
                            pointBorderWidth: showPoints ? 2 : 0,
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: 'rgb(168, 85, 247)',
                            pointHoverBorderColor: '#fff',
                            pointHoverBorderWidth: 2,
                        },
                    ]);
                })
                .catch(() => resolve([]));
        });
    }

    /**
     * Shared chart options for all charts
     */
    get chartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#9CA3AF',
                        usePointStyle: true,
                        pointStyleWidth: 8,
                        boxHeight: 8,
                        padding: 15,
                        font: {
                            size: 12,
                            weight: '500',
                        },
                    },
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#F9FAFB',
                    bodyColor: '#E5E7EB',
                    borderColor: '#374151',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        title: (context) => {
                            return format(new Date(context[0].parsed.x), 'MMM d, yyyy h:mm a');
                        },
                        label: (context) => {
                            const value = context.parsed.y;
                            const label = context.dataset.label || '';
                            // Format small values with decimals, large values as whole numbers
                            const formattedValue = value < 10 ? value.toFixed(3) : Math.round(value);
                            return `${label}: ${formattedValue}`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        displayFormats: {
                            hour: 'MMM d, ha',
                        },
                        tooltipFormat: 'MMM d, yyyy h:mm a',
                    },
                    grid: {
                        display: false,
                        drawBorder: false,
                    },
                    ticks: {
                        color: '#6B7280',
                        maxRotation: 0,
                        autoSkipPadding: 20,
                    },
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)',
                        drawBorder: false,
                    },
                    ticks: {
                        color: '#6B7280',
                        callback: function(value) {
                            // Show decimals for small values (< 10), whole numbers for larger
                            return value < 10 ? value.toFixed(2) : Math.round(value);
                        },
                    },
                },
            },
            animation: {
                duration: 750,
                easing: 'easeInOutQuart',
            },
        };
    }
}
