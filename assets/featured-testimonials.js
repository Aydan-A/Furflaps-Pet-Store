if (!customElements.get('featured-testimonials')) {
  class FeaturedTestimonials extends HTMLElement {
    connectedCallback() {
      this.slides = Array.from(this.querySelectorAll('[data-slide]'));
      if (this.slides.length < 2) return;

      this.index = Math.max(0, this.slides.findIndex((slide) => slide.classList.contains('is-active')));
      this.addEventListener('click', this.onClick);
      this.addEventListener('shopify:block:select', this.onBlockSelect);
      this.addEventListener('mouseenter', this.pause);
      this.addEventListener('mouseleave', this.start);
      this.start();
    }

    disconnectedCallback() {
      this.removeEventListener('click', this.onClick);
      this.removeEventListener('shopify:block:select', this.onBlockSelect);
      this.removeEventListener('mouseenter', this.pause);
      this.removeEventListener('mouseleave', this.start);
      this.pause();
    }

    onClick = (event) => {
      if (event.target.closest('[data-previous]')) this.show(this.index - 1);
      if (event.target.closest('[data-next]')) this.show(this.index + 1);
    };

    onBlockSelect = (event) => {
      const slide = event.target.closest('[data-slide]');
      if (slide) this.show(Number(slide.dataset.index));
      this.pause();
    };

    show(index) {
      this.index = (index + this.slides.length) % this.slides.length;
      this.slides.forEach((slide, slideIndex) => {
        const active = slideIndex === this.index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
      });

      const activeSlide = this.slides[this.index];
      const current = activeSlide.querySelector('[data-current]');
      const progress = activeSlide.querySelector('[data-progress]');
      if (current) current.textContent = this.index + 1;
      if (progress) progress.style.width = `${((this.index + 1) / this.slides.length) * 100}%`;
    }

    start = () => {
      this.pause();
      if (this.dataset.autoplay !== 'true' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      this.timer = window.setInterval(() => this.show(this.index + 1), Number(this.dataset.interval) || 5000);
    };

    pause = () => {
      if (this.timer) window.clearInterval(this.timer);
      this.timer = null;
    };
  }

  customElements.define('featured-testimonials', FeaturedTestimonials);
}
