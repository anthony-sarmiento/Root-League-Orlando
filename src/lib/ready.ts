// "Ready" means the page has finished loading and painted. Decorative images and the web fonts wait for it, so
// the first paint only ever competes with the HTML, the stylesheet and the scripts.

let ready = false;
const listeners = new Set<() => void>();

export const subscribeReady = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getReady = () => ready;
/** On the server nothing is ready, and neither is the first client render, so the two always match. */
export const getServerReady = () => false;

export function markReady() {
  if (ready) return;
  ready = true;
  // The stylesheet only asks for fonts and decorative backgrounds once these classes are present.
  document.documentElement.classList.add("ready", "fonts");
  listeners.forEach((listener) => listener());
}
