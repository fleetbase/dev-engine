import Controller from '@ember/controller';
import { action } from '@ember/object';

export default class LogsViewController extends Controller {
    @action goBack() {
        return window.history.back();
    }
}
