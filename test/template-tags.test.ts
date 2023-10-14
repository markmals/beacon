import { LitElement } from 'lit';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signal } from '../src';
import { html } from '../src/lit/template-tags';

let elementNameId = 0;
const generateElementName = () => `test-${elementNameId++}`;

describe('html tag', () => {
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
        class TestElement extends LitElement {
            override render() {
                return html`<p>count: ${count}</p>`;
            }
        }
        customElements.define(generateElementName(), TestElement);
        const el = new TestElement();
        container.append(el);

        await el.updateComplete;
        expect(el.shadowRoot?.querySelector('p')?.textContent).toEqual('count: 0');

        count.value = 1;

        expect(el.shadowRoot?.querySelector('p')?.textContent).toEqual('count: 1');
    });
});
