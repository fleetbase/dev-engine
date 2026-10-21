import { helper } from '@ember/component/helper';
import credentialName from '../utils/credential-name';

export default helper(function ([value]) {
    return credentialName(value);
});
