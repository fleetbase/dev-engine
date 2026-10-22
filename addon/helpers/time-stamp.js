import { helper } from '@ember/component/helper';
import { timeStamp } from '../utils/format';

export default helper(function timeStampHelper([value, pattern]) {
    return timeStamp(value, pattern);
});
