import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { format, subDays } from 'date-fns';

/**
 * The 7d / 30d / 90d / 180d / 365d switch in the dashboard header. Writes the
 * period to the developer-metrics service, which every widget reads.
 */
export default class DashboardPeriodSelectorComponent extends Component {
    @service developerMetrics;

    get periods() {
        return this.developerMetrics.periods.map((period) => ({ period, isActive: period === this.developerMetrics.period }));
    }

    get rangeText() {
        const days = this.developerMetrics.periodDays;
        const end = new Date();
        const start = subDays(end, days);

        return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`;
    }

    @action select(period) {
        this.developerMetrics.setPeriod(period);
    }
}
