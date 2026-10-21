/**
 * The ember-ui table fires `@onRowClick` for any click inside the row, including
 * the actions dropdown, checkboxes, links and buttons. Row handlers skip those
 * so a click on a control never also opens the row.
 */
export default function isRowControlClick(event = typeof window !== 'undefined' ? window.event : null) {
    const target = event?.target;

    if (!target || typeof target.closest !== 'function') {
        return false;
    }

    return Boolean(target.closest('.cell-dropdown-button, .dropdown, .fleetbase-checkbox, a, button, input, select, textarea, [role="menu"], [role="button"]'));
}
