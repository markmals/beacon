import { AsyncDirective } from 'lit/async-directive.js';
import { directive } from 'lit/directive.js';
import { EffectRef, ReadableSignal, effect, untrack } from '..';

class TrackDirective extends AsyncDirective {
    #signal?: ReadableSignal<unknown>;
    #ref?: EffectRef;

    override render(signal: ReadableSignal<unknown>) {
        if (signal !== this.#signal) {
            this.#ref?.destroy();
            this.#signal = signal;

            // Whether the subscribe() callback is called because of this render
            // pass, or because of a separate signal update.
            let updateFromLit = true;
            this.#ref = effect(() => {
                // The subscribe() callback is called synchronously during subscribe.
                // Ignore the first call since we return the value below in that case.
                if (updateFromLit === false) {
                    this.setValue(signal.value);
                }
            });
            updateFromLit = false;
        }

        // We use untrack() so that the signal access is not tracked by the effect
        // created by SignalTracker.performUpdate(). This means that a signal
        // update won't trigger a full element update if it's only passed to
        // track() and not otherwise accessed by the element.
        return untrack(() => signal.value);
    }

    protected override disconnected(): void {
        this.#ref?.destroy();
    }

    protected override reconnected(): void {
        // Since we disposed the subscription in disconnected() we need to
        // resubscribe here. We don't ignore the synchronous callback call because
        // the signal might have changed while the directive is disconnected.
        //
        // There are two possible reasons for a disconnect:
        //   1. The host element was disconnected.
        //   2. The directive was not rendered during a render
        // In the first case the element will not schedule an update on reconnect,
        // so we need the synchronous call here to set the current value.
        // In the second case, we're probably reconnecting *because* of a render,
        // so the synchronous call here will go before a render call, and we'll get
        // two sets of the value (setValue() here and the return in render()), but
        // this is ok because the value will be dirty-checked by lit-html.
        this.#ref = effect(() => {
            this.setValue(this.#signal?.value);
        });
    }
}

/**
 * Renders a signal and subscribes to it, updating the part when the signal
 * changes.
 */
export const track = directive(TrackDirective);
