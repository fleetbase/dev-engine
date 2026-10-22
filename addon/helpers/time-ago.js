import { helper } from '@ember/component/helper';
import { timeAgo } from '../utils/format';

export default helper(function timeAgoHelper([value]) {
    return timeAgo(value);
});
