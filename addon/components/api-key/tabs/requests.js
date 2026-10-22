import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { formatSeconds, timeStamp, statusTone } from '../../../utils/format';

/**
 * Requests tab: the newest requests made with this key, from the shared sample.
 */
export default class ApiKeyTabsRequestsComponent extends Component {
    @service apiKeyInsights;
    @service apiKeyActions;
    @service developerPanels;
    @service store;

    get apiKey() {
        return this.args.resource ?? this.args.model;
    }

    get insights() {
        return this.apiKeyInsights.ensure(this.apiKey);
    }

    get rows() {
        return this.insights.logs.slice(0, 50).map((log) => ({
            log,
            tone: statusTone(log.status_code),
            status: [log.status_code, log.reason_phrase].filter(Boolean).join(' '),
            duration: formatSeconds(log.duration),
            isSlow: Number(log.duration ?? 0) >= 1,
            time: timeStamp(log.created_at, 'MMM d, HH:mm:ss'),
        }));
    }

    @action open(log) {
        const record = this.store.push(this.store.normalize('api-request-log', log));

        return this.developerPanels.openRequest(record);
    }

    @action viewAll() {
        this.args.close?.();
        return this.apiKeyActions.viewRequestLogs(this.apiKey);
    }

    @action refresh() {
        return this.apiKeyInsights.refresh(this.apiKey);
    }
}
