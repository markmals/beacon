import { LitElement, type ReactiveElement } from 'lit';
import { effect } from '..';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReactiveElementConstructor = new (...args: any[]) => ReactiveElement;

/**
 * Adds the ability for a LitElement or other ReactiveElement class to
 * watch for access to Preact signals during the update lifecycle and
 * trigger a new update when signals values change.
 */
export function SignalTracker<T extends ReactiveElementConstructor>(Base: T): T {
    return class SignalTracker extends Base {
        #cleanup?: DisposableStack;

        override performUpdate() {
            // ReactiveElement.performUpdate() also does this check, so we want to
            // also bail early so we don't erroneously appear to not depend on any
            // signals.
            if (this.isUpdatePending === false) {
                return;
            }
            // If we have a previous effect, dispose it
            this.#cleanup?.dispose();

            // Tracks whether the effect callback is triggered by this performUpdate
            // call directly, or by a signal change.
            let updateFromLit = true;

            // We create a new effect to capture all signal access within the
            // performUpdate phase (update, render, updated, etc) of the element.
            // Q: Do we need to create a new effect each render?
            // TODO: test various combinations of render triggers:
            //  - from requestUpdate()
            //  - from signals
            //  - from both (do we get one or two re-renders)
            // and see if we really need a new effect here.
            this.#cleanup = effect(() => {
                if (updateFromLit) {
                    updateFromLit = false;
                    super.performUpdate();
                } else {
                    // This branch is an effect run from Preact signals.
                    // This will cause another call into performUpdate, which will
                    // then create a new effect watching that update pass.
                    this.requestUpdate();
                }
            });
        }

        override connectedCallback(): void {
            super.connectedCallback();
            // In order to listen for signals again after re-connection, we must
            // re-render to capture all the current signal accesses.
            this.requestUpdate();
        }

        override disconnectedCallback(): void {
            super.disconnectedCallback();
            this.#cleanup?.dispose();
        }
    };
}

export const TrackedElement = SignalTracker(LitElement);
