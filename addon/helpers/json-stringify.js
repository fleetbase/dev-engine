import { helper } from '@ember/component/helper';

export default helper(function jsonStringify([jsonable]) {
    return JSON.stringify(jsonable, null, 2);
});
