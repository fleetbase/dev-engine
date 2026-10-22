import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';

/**
 * A row of bars for a metrics/dev/api-traffic response: one bar per label,
 * tinted red when most of that day's requests failed.
 */
export default class RequestHistogramComponent extends Component {
    get bars() {
        const traffic = this.args.traffic;

        if (!traffic?.labels?.length) {
            return [];
        }

        const requests = traffic.datasets?.find((set) => set.label === 'Requests')?.data ?? [];
        const errors = traffic.datasets?.find((set) => set.label === 'Errors')?.data ?? [];
        const max = Math.max(1, ...requests);

        return traffic.labels.map((label, index) => {
            const count = requests[index] ?? 0;
            const failed = errors[index] ?? 0;
            const height = Math.round((count / max) * 100);

            return { label, count, failed, style: htmlSafe(`height: ${height}%`), isError: failed > 0 && failed >= count / 2, title: `${label}: ${count} requests, ${failed} errors` };
        });
    }

    get total() {
        return this.bars.reduce((sum, bar) => sum + bar.count, 0);
    }
}
