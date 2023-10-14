import { html as coreHtml, svg as coreSvg, type TemplateResult } from 'lit/html.js';
import { isSignal } from '../index.js';
import { track } from './track.js';

/**
 * Wraps a lit-html template tag function (`html` or `svg`) to add support for
 * automatically wrapping Signal instances in the `watch()` directive.
 */
export const withTracking =
    (coreTag: typeof coreHtml | typeof coreSvg) =>
    (strings: TemplateStringsArray, ...values: unknown[]): TemplateResult => {
        // TODO (justinfagnani): use an alternative to instanceof when
        // one is available. See https://github.com/preactjs/signals/issues/402
        return coreTag(strings, ...values.map(v => (isSignal(v) ? track(v) : v)));
    };

/**
 * Interprets a template literal as an HTML template that can efficiently
 * render to and update a container.
 *
 * Includes signal watching support from `withTracking()`.
 */
export const html = withTracking(coreHtml);

/**
 * Interprets a template literal as an SVG template that can efficiently
 * render to and update a container.
 *
 * Includes signal watching support from `withTracking()`.
 */
export const svg = withTracking(coreSvg);
