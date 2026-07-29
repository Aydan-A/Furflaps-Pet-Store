if (!customElements.get('furflaps-hero')) {
  class FurflapsHero extends HTMLElement {
    constructor() {
      super();
      this.track = this.querySelector('[data-hero-track]');
      this.slides = Array.from(this.querySelectorAll('[data-hero-slide]'));
      this.indicators = Array.from(this.querySelectorAll('[data-hero-indicator]'));
      this.activeIndex = 0;
      this.scrollFrame = null;
      this.autoplayTimer = null;
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    }

    connectedCallback() {
      if (!this.track || this.slides.length < 2) return;

      this.track.addEventListener('scroll', this.onScroll, { passive: true });
      this.track.addEventListener('keydown', this.onKeydown);
      this.indicators.forEach((indicator) => indicator.addEventListener('click', this.onIndicatorClick));
      this.addEventListener('mouseenter', this.pauseAutoplay);
      this.addEventListener('mouseleave', this.startAutoplay);
      this.addEventListener('focusin', this.pauseAutoplay);
      this.addEventListener('focusout', this.onFocusOut);
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      document.addEventListener('shopify:block:select', this.onBlockSelect);
      this.startAutoplay();
    }

    disconnectedCallback() {
      this.track?.removeEventListener('scroll', this.onScroll);
      this.track?.removeEventListener('keydown', this.onKeydown);
      this.indicators.forEach((indicator) => indicator.removeEventListener('click', this.onIndicatorClick));
      this.removeEventListener('mouseenter', this.pauseAutoplay);
      this.removeEventListener('mouseleave', this.startAutoplay);
      this.removeEventListener('focusin', this.pauseAutoplay);
      this.removeEventListener('focusout', this.onFocusOut);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      document.removeEventListener('shopify:block:select', this.onBlockSelect);
      this.pauseAutoplay();
    }

    onScroll = () => {
      if (this.scrollFrame) cancelAnimationFrame(this.scrollFrame);
      this.scrollFrame = requestAnimationFrame(() => {
        const index = Math.round(this.track.scrollLeft / this.track.clientWidth);
        this.setActiveIndex(index);
      });
    };

    onKeydown = (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      this.goToSlide(this.activeIndex + direction);
    };

    onIndicatorClick = (event) => {
      this.goToSlide(Number(event.currentTarget.dataset.heroIndicator));
    };

    onFocusOut = (event) => {
      if (!this.contains(event.relatedTarget)) this.startAutoplay();
    };

    onVisibilityChange = () => {
      if (document.hidden) this.pauseAutoplay();
      else this.startAutoplay();
    };

    onBlockSelect = (event) => {
      const slide = event.target.closest('[data-hero-slide]');
      if (!slide || !this.contains(slide)) return;
      this.pauseAutoplay();
      this.goToSlide(this.slides.indexOf(slide));
    };

    setActiveIndex(index) {
      const boundedIndex = Math.max(0, Math.min(index, this.slides.length - 1));
      if (boundedIndex === this.activeIndex) return;
      this.activeIndex = boundedIndex;
      this.indicators.forEach((indicator, indicatorIndex) => {
        indicator.setAttribute('aria-current', indicatorIndex === boundedIndex ? 'true' : 'false');
      });
    }

    goToSlide(index) {
      const wrappedIndex = (index + this.slides.length) % this.slides.length;
      this.slides[wrappedIndex].scrollIntoView({
        behavior: this.reduceMotion.matches ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'start',
      });
      this.setActiveIndex(wrappedIndex);
    }

    startAutoplay = () => {
      this.pauseAutoplay();
      if (this.dataset.autoplay !== 'true' || this.reduceMotion.matches || document.hidden) return;
      const delay = Number(this.dataset.autoplayDelay) * 1000;
      this.autoplayTimer = window.setInterval(() => this.goToSlide(this.activeIndex + 1), delay);
    };

    pauseAutoplay = () => {
      if (!this.autoplayTimer) return;
      window.clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    };
  }

  customElements.define('furflaps-hero', FurflapsHero);
}
