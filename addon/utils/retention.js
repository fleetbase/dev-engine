/**
 * How many days of API request logs and webhook delivery logs the platform keeps.
 *
 * core-api schedules `purge:api-logs --days 2` and `purge:webhook-logs --days 2`
 * (CoreServiceProvider). The UI states this value wherever a list or panel
 * promises history.
 *
 * TODO(v1.1): read this from the runtime config the console fetches so the
 * console and the scheduler cannot drift apart.
 */
export const RETENTION_DAYS = 2;

export default RETENTION_DAYS;
