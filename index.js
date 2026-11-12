/**
 * `dsh-mobile-boost` — host half.
 *
 * The whole plugin lives in the browser (`client.js`): one injected stylesheet
 * and one focus handler. The host half exists only so the Loader has a row to
 * mount, matching the shape every bundle plugin uses — a row in
 * `cordis.patch.yml` plus an `apply()` that may be empty.
 *
 * Keeping the host half empty is deliberate: no routes, no services, no
 * request surface, so installing this plugin can never widen the host's
 * attack surface, and it needs no restart of `dsh web` beyond the bundle
 * reload that any install already triggers.
 */

export const name = 'dsh-mobile-boost'

/** No host-side behaviour: the browser half does the work. */
export function apply() {}
