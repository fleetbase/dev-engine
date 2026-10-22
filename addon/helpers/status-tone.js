import { helper } from '@ember/component/helper';
import { statusTone } from '../utils/format';

export default helper(function statusToneHelper([code]) {
    return statusTone(code);
});
