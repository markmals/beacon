import { LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';
import { cache } from 'lit/directives/cache.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { memo, signal } from '../src';
import { SignalTracker } from '../src/lit/signal-tracker';
import { track } from '../src/lit/track';

let elementNameId = 0;
const generateElementName = () => `test-${elementNameId++}`;

describe('watch directive', () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        container?.remove();
    });

    it('watches a signal', async () => {
        let renderCount = 0;
        const count = signal(0);
        class TestElement extends LitElement {
            override render() {
                renderCount++;
                return html`<p>count: ${track(count)}</p>`;
            }
        }
        customElements.define(generateElementName(), TestElement);
        const el = new TestElement();
        container.append(el);

        // The first DOM update is because of an element render
        await el.updateComplete;
        expect(el.shadowRoot?.querySelector('p')?.textContent).toEqual('count: 0');
        expect(renderCount).toEqual(1);

        // The DOM updates because signal update
        count.set(1);
        expect(el.shadowRoot?.querySelector('p')?.textContent).toEqual('count: 1');
        // The updated DOM is not because of an element render
        expect(renderCount).toEqual(1);
    });

    it('unsubscribes to a signal on element disconnect', async () => {
        let readCount = 0;
        const count = signal(0);
        const countPlusOne = memo(() => {
            readCount++;
            return count() + 1;
        });

        class TestElement extends LitElement {
            override render() {
                return html`<p>count: ${track(countPlusOne)}</p>`;
            }
        }
        customElements.define(generateElementName(), TestElement);
        const el = new TestElement();
        container.append(el);

        // First render, expect one read of the signal
        await el.updateComplete;
        expect(el.shadowRoot?.querySelector('p')?.textContent).toEqual('count: 1');
        expect(readCount).toEqual(1);

        // Force the directive to disconnect
        el.remove();
        await el.updateComplete;

        // Expect no reads while disconnected
        count.set(1);
        expect(el.shadowRoot?.querySelector('p')?.textContent).toEqual('count: 1');
        expect(readCount).toEqual(1);

        // Even after an update
        await el.updateComplete;
        expect(el.shadowRoot?.querySelector('p')?.textContent).toEqual('count: 1');
        expect(readCount).toEqual(1);

        // Force the directive to reconnect
        container.append(el);
        // Elements do *not* automatically render when re-connected
        expect(el.isUpdatePending).toBeFalsy();

        // So when reconnected, we read the signal value again
        expect(el.shadowRoot?.querySelector('p')?.textContent).toEqual('count: 2');
        expect(readCount).toEqual(2);

        // And signal updates propagate again
        count.set(2);
        expect(el.shadowRoot?.querySelector('p')?.textContent).toEqual('count: 3');
        expect(readCount).toEqual(3);
    });

    it('unsubscribes to a signal on directive disconnect', async () => {
        let readCount = 0;
        const count = signal(0);
        const countPlusOne = memo(() => {
            readCount++;
            return count() + 1;
        });

        class TestElement extends LitElement {
            @property() accessor renderWithSignal = true;

            signalTemplate = html`${track(countPlusOne)}`;

            stringTemplate = html`string`;

            override render() {
                const t = this.renderWithSignal ? this.signalTemplate : this.stringTemplate;
                // Cache the expression so that we preserve the directive instance
                // and trigger the reconnected code-path.
                // TODO (justinfagnani): it would be nice if we could assert that we
                // really did trigger reconnected instead of rendering a new directive,
                // but we don't want to code the directive to specifically leave a trace
                // of reconnected-ness.
                return html`<p>value: ${cache(t)}</p>`;
            }
        }
        customElements.define(generateElementName(), TestElement);
        const el = new TestElement();
        container.append(el);

        // First render with the signal, expect one read of the signal
        await el.updateComplete;
        expect(el.shadowRoot?.querySelector('p')?.textContent).toEqual('count: 1');
        expect(readCount).toEqual(1);

        // Render with a non-signal
        el.renderWithSignal = false;
        await el.updateComplete;

        // Expect no reads while disconnected
        count.set(1);
        expect(el.shadowRoot?.querySelector('p')?.textContent).toEqual('value: string');
        expect(readCount).toEqual(1);

        // Render with the signal again
        el.renderWithSignal = true;
        await el.updateComplete;

        // Render should use the new value
        expect(el.shadowRoot?.querySelector('p')?.textContent).toEqual('value: 2');
        expect(readCount).toEqual(2);

        // And signal updates propagate again
        count.set(2);
        expect(el.shadowRoot?.querySelector('p')?.textContent).toEqual('value: 3');
        expect(readCount).toEqual(3);
    });

    it('does not trigger an element update', async () => {
        let renderCount = 0;
        const count = signal(0);
        class TestElement extends SignalTracker(LitElement) {
            override render() {
                renderCount++;
                return html`<p>count: ${track(count)}</p>`;
            }
        }
        customElements.define(generateElementName(), TestElement);
        const el = new TestElement();
        container.append(el);

        await el.updateComplete;
        expect(el.shadowRoot?.querySelector('p')?.textContent).toEqual('count: 0');
        expect(renderCount).toEqual(1);

        count.set(1);
        expect(el.shadowRoot?.querySelector('p')?.textContent).toEqual('count: 1');
        // The updated DOM is not because of an element render
        expect(renderCount, 'A').toEqual(1);
        // The signal update does not trigger a render
        expect(el.isUpdatePending).toBeFalsy();
    });
});
