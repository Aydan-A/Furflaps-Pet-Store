/*
  Before/after comparison.

  The reveal position lives in a single custom property on the element, which the
  clip-path and the divider both read. Shopify replaces the whole section markup
  when a setting changes in the Theme Editor, and the replacement upgrades a fresh
  instance of this element - so connectedCallback is the initialisation hook and a
  `shopify:section:load` listener would only double-bind.
*/
if (!customElements.get('before-after-comparison')) {
  class BeforeAfterComparison extends HTMLElement {
    connectedCallback() {
      this.range = this.querySelector('[data-comparison-range]');
      if (!this.range || this.initialized) return;

      this.initialized = true;
      this.range.addEventListener('input', this.onInput);
      this.setPosition(this.range.value);
    }

    disconnectedCallback() {
      this.range?.removeEventListener('input', this.onInput);
      this.initialized = false;
    }

    onInput = (event) => this.setPosition(event.target.value);

    setPosition(value) {
      const position = Math.min(100, Math.max(0, Number(value) || 0));
      this.style.setProperty('--bac-position', `${position}%`);
      this.range.setAttribute('aria-valuetext', `${position}% of the after image shown`);
    }
  }

  customElements.define('before-after-comparison', BeforeAfterComparison);
}
