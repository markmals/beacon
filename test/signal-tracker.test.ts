import { LitElement, html } from 'lit';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { memo, signal } from '../src';
import { SignalTracker } from '../src/lit/signal-tracker';

let elementNameId = 0;
const generateElementName = () => `test-${elementNameId++}`;

describe('SignalTracker', () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        container?.remove();
    });

    it('watches a signal', async () => {
        const count = signal(0);
        class TestElement extends SignalTracker(LitElement) {
            override render() {
                return html`<p>count: ${count()}</p>`;
            }
        }
        customElements.define(generateElementName(), TestElement);
        const el = new TestElement();
        container.append(el);

        await el.updateComplete;
        expect(el.shadowRoot?.querySelector('p')?.textContent).toEqual('count: 0');

        count.set(1);

        await el.updateComplete;
        expect(el.shadowRoot?.querySelector('p')?.textContent).toEqual('count: 1');
    });

    it('unsubscribes to a signal on element disconnect', async () => {
        let readCount = 0;
        const count = signal(0);
        const countPlusOne = memo(() => {
            readCount++;
            return count() + 1;
        });

        class TestElement extends SignalTracker(LitElement) {
            override render() {
                return html`<p>count: ${countPlusOne()}</p>`;
            }
        }
        customElements.define(generateElementName(), TestElement);
        const el = new TestElement();
        container.append(el);

        // First render, expect one read of the signal
        await el.updateComplete;
        expect(el.shadowRoot?.querySelector('p')?.textContent).toEqual('count: 1');
        expect(readCount).toEqual(1);

        // Disconnect the element
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

        // Reconnect the element
        container.append(el);
        expect(el.isConnected).toBeTruthy();
        // The mixin causes the element to update on re-connect
        expect(el.isUpdatePending).toBeTruthy();

        // So when reconnected, we still have the old value
        expect(el.shadowRoot?.querySelector('p')?.textContent).toEqual('count: 1');
        expect(readCount).toEqual(1);

        // And signal updates propagate again - and we get the new value
        count.set(2);
        expect(el.isUpdatePending).toBeTruthy();
        await el.updateComplete;
        expect(el.shadowRoot?.querySelector('p')?.textContent).toEqual('count: 3');
        expect(readCount).toEqual(2);
    });
});
