if (!customElements.get('before-after-comparison')) {
  class BeforeAfterComparison extends HTMLElement {
    connectedCallback() {
      this.range = this.querySelector('[data-comparison-range]');
      this.media = this.querySelector('[data-comparison-media]');
      if (!this.range || !this.media) return;

      this.range.addEventListener('input', this.updatePosition);
      this.updatePosition();
    }

    disconnectedCallback() {
      this.range?.removeEventListener('input', this.updatePosition);
    }

    updatePosition = () => {
      const position = Math.max(0, Math.min(100, Number(this.range.value)));
      this.style.setProperty('--bac-position', `${position}%`);
      this.range.setAttribute('aria-valuetext', `${position}% after image revealed`);
    };
  }

  customElements.define('before-after-comparison', BeforeAfterComparison);
}
