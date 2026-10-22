import Controller from '@ember/controller';
import { inject as service } from '@ember/service';

export default class HomeIndexController extends Controller {
    @service developerMetrics;

    constructor() {
        super(...arguments);

        if (!this.developerMetrics.kpis) {
            this.developerMetrics.loadKpis.perform();
        }
    }
}
