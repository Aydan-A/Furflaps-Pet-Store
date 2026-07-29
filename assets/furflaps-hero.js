if (!customElements.get('furflaps-hero')) {
  class FurflapsHero extends HTMLElement {
    constructor() {
      super();
      this.track = this.querySelector('[data-hero-track]');
      this.mediaTrack = this.querySelector('[data-hero-media-track]');
      this.slides = Array.from(this.querySelectorAll('[data-hero-slide]'));
      this.mediaSlides = Array.from(this.querySelectorAll('[data-hero-media-slide]'));
      this.indicators = Array.from(this.querySelectorAll('[data-hero-indicator]'));
      this.activeIndex = -1;
      this.scrollFrame = null;
      this.autoplayTimer = null;
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    }

    connectedCallback() {
      if (!this.track || !this.mediaTrack || this.mediaSlides.length < 2) return;

      this.mediaTrack?.addEventListener('scroll', this.onScroll, { passive: true });
      this.mediaTrack?.addEventListener('keydown', this.onKeydown);
      this.indicators.forEach((indicator) => indicator.addEventListener('click', this.onIndicatorClick));
      this.addEventListener('mouseenter', this.pauseAutoplay);
      this.addEventListener('mouseleave', this.startAutoplay);
      this.addEventListener('focusin', this.pauseAutoplay);
      this.addEventListener('focusout', this.onFocusOut);
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      document.addEventListener('shopify:block:select', this.onBlockSelect);
      this.setActiveIndex(0);
      this.startAutoplay();
    }

    disconnectedCallback() {
      this.mediaTrack?.removeEventListener('scroll', this.onScroll);
      this.mediaTrack?.removeEventListener('keydown', this.onKeydown);
      this.indicators.forEach((indicator) => indicator.removeEventListener('click', this.onIndicatorClick));
      this.removeEventListener('mouseenter', this.pauseAutoplay);
      this.removeEventListener('mouseleave', this.startAutoplay);
      this.removeEventListener('focusin', this.pauseAutoplay);
      this.removeEventListener('focusout', this.onFocusOut);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      document.removeEventListener('shopify:block:select', this.onBlockSelect);
      this.pauseAutoplay();
    }

    onScroll = (event) => {
      if (this.scrollFrame) cancelAnimationFrame(this.scrollFrame);
      this.scrollFrame = requestAnimationFrame(() => {
        const source = event.currentTarget;
        const progress = source.clientWidth ? source.scrollLeft / source.clientWidth : 0;
        const index = Math.round(progress);
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
      const slide = event.target.closest('[data-hero-media-slide]');
      if (!slide || !this.contains(slide)) return;
      this.pauseAutoplay();
      this.goToSlide(this.mediaSlides.indexOf(slide));
    };

    setActiveIndex(index) {
      const boundedIndex = Math.max(0, Math.min(index, this.mediaSlides.length - 1));
      if (boundedIndex === this.activeIndex) return;
      this.activeIndex = boundedIndex;
      this.indicators.forEach((indicator, indicatorIndex) => {
        indicator.setAttribute('aria-current', indicatorIndex === boundedIndex ? 'true' : 'false');
      });
      this.mediaSlides.forEach((slide, slideIndex) => {
        slide.setAttribute('aria-hidden', slideIndex === boundedIndex ? 'false' : 'true');
      });
    }

    goToSlide(index) {
      const wrappedIndex = (index + this.mediaSlides.length) % this.mediaSlides.length;
      const behavior = this.reduceMotion.matches ? 'auto' : 'smooth';
      this.mediaTrack?.scrollTo({ left: wrappedIndex * this.mediaTrack.clientWidth, behavior });
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
