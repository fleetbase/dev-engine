import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency';
import { htmlSafe } from '@ember/template';
import { next } from '@ember/runloop';
import { RETENTION_DAYS } from '../utils/retention';

const SAMPLE = 200;
const HOURS = RETENTION_DAYS * 24;

/**
 * Per-key usage read from the existing request log and webhook endpoints,
 * shared by the key drawer tabs so each key is fetched once per session.
 */
class KeyInsights {
    @tracked total = null;
    @tracked logs = [];
    @tracked errors = 0;
    @tracked avgMs = null;
    @tracked p95Ms = null;
    @tracked bars = [];
    @tracked webhooks = [];
    @tracked webhookTotal = 0;
    @tracked error = null;
    @tracked loadedAt = null;

    get errorRate() {
        const sampled = this.logs.length;

        return sampled ? Math.round((this.errors / sampled) * 1000) / 10 : 0;
    }

    get isLoaded() {
        return this.loadedAt !== null;
    }
}

export default class ApiKeyInsightsService extends Service {
    @service fetch;

    #byKey = new Map();
    #requested = new Set();

    /**
     * The insights object for a key, created empty on first use.
     */
    stateFor(apiKey) {
        const id = typeof apiKey === 'string' ? apiKey : apiKey?.id;

        if (!this.#byKey.has(id)) {
            this.#byKey.set(id, new KeyInsights());
        }

        return this.#byKey.get(id);
    }

    /**
     * Loads once per key; call `refresh` to force.
     */
    ensure(apiKey) {
        const state = this.stateFor(apiKey);
        const id = typeof apiKey === 'string' ? apiKey : apiKey?.id;

        // Tabs call this while rendering, so the fetch starts on the next run
        // loop and never updates a tracked value inside the same computation.
        if (!state.isLoaded && !this.#requested.has(id)) {
            this.#requested.add(id);
            next(this, () => this.load.perform(apiKey));
        }

        return state;
    }

    refresh(apiKey) {
        return this.load.perform(apiKey);
    }

    @task *load(apiKey) {
        const state = this.stateFor(apiKey);
        state.error = null;

        try {
            const [logsResponse, webhooksResponse] = yield Promise.all([
                this.fetch.get('api-request-logs', { key: apiKey.id, limit: SAMPLE, sort: '-created_at' }),
                this.fetch.get('webhook-endpoints', { api_credential_uuid: apiKey.id, limit: 25 }),
            ]);

            const logs = logsResponse?.api_request_logs ?? [];
            const durations = logs.map((log) => Number(log.duration ?? 0) * 1000).filter((ms) => Number.isFinite(ms));

            state.logs = logs;
            state.total = logsResponse?.meta?.total ?? logs.length;
            state.errors = logs.filter((log) => Number(log.status_code) >= 400).length;
            state.avgMs = durations.length ? Math.round(durations.reduce((sum, ms) => sum + ms, 0) / durations.length) : null;
            state.p95Ms = durations.length ? Math.round([...durations].sort((a, b) => a - b)[Math.min(durations.length - 1, Math.floor(durations.length * 0.95))]) : null;
            state.bars = this.bucketByHour(logs);
            state.webhooks = webhooksResponse?.webhook_endpoints ?? [];
            state.webhookTotal = webhooksResponse?.meta?.total ?? state.webhooks.length;
        } catch (error) {
            state.error = error?.message ?? String(error);
        }

        state.loadedAt = new Date();

        return state;
    }

    /**
     * Requests per hour over the retention window, newest bucket last.
     */
    bucketByHour(logs) {
        const now = Date.now();
        const buckets = Array.from({ length: HOURS }, (_, index) => ({ offset: HOURS - 1 - index, count: 0, errors: 0 }));

        logs.forEach((log) => {
            const age = Math.floor((now - new Date(log.created_at).getTime()) / 3600000);

            if (age < 0 || age >= HOURS) {
                return;
            }

            const bucket = buckets[HOURS - 1 - age];
            bucket.count += 1;

            if (Number(log.status_code) >= 400) {
                bucket.errors += 1;
            }
        });

        const max = Math.max(1, ...buckets.map((bucket) => bucket.count));

        return buckets.map((bucket) => {
            const height = Math.round((bucket.count / max) * 100);

            return { ...bucket, height, style: htmlSafe(`height: ${height}%`), isError: bucket.errors > 0 && bucket.errors >= bucket.count / 2 };
        });
    }
}
