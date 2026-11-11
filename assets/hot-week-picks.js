if (!customElements.get('hot-week-picks')) {
  class HotWeekPicks extends HTMLElement {
    connectedCallback() {
      this.tabs = Array.from(this.querySelectorAll('[role="tab"]'));
      this.panels = Array.from(this.querySelectorAll('[role="tabpanel"]'));
      this.tracks = Array.from(this.querySelectorAll('.hot-week-picks__products'));
      this.nav = this.querySelector('[data-nav]');
      this.arrows = Array.from(this.querySelectorAll('.hot-week-picks__arrow'));

      this.tabs.forEach((tab) => {
        tab.addEventListener('click', this.onTabClick);
        tab.addEventListener('keydown', this.onTabKeydown);
      });

      this.arrows.forEach((arrow) => arrow.addEventListener('click', this.onArrowClick));
      this.addEventListener('change', this.onColorChange);
      this.tracks.forEach((track) => track.addEventListener('scroll', this.onScroll, { passive: true }));

      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(() => this.update());
        this.tracks.forEach((track) => this.resizeObserver.observe(track));
      }

      this.update();
    }

    disconnectedCallback() {
      this.tabs?.forEach((tab) => {
        tab.removeEventListener('click', this.onTabClick);
        tab.removeEventListener('keydown', this.onTabKeydown);
      });
      this.arrows?.forEach((arrow) => arrow.removeEventListener('click', this.onArrowClick));
      this.tracks?.forEach((track) => track.removeEventListener('scroll', this.onScroll));
      this.resizeObserver?.disconnect();
      this.removeEventListener('change', this.onColorChange);
    }

    // A colour or size radio points the card links at the variant with both
    // picks; a colour radio also swaps the image to that colour.
    onColorChange = (event) => {
      const input = event.target;
      const isColor = input.matches?.('.hot-card__color-input');
      if (!isColor && !input.matches?.('.hot-card__size-input')) return;
      const card = input.closest('.hot-week-picks__card');
      if (!card) return;

      const { imageSrc, imageSrcset } = input.dataset;
      const image = card.querySelector('.hot-card__image');
      if (isColor && image && imageSrc) {
        if (imageSrcset) image.srcset = imageSrcset;
        image.src = imageSrc;
      }

      const picked = Array.from(
        card.querySelectorAll('.hot-card__color-input:checked, .hot-card__size-input:checked'),
        (radio) => radio.value
      );
      let variants = [];
      try {
        variants = JSON.parse(card.querySelector('[data-card-variants]')?.textContent || '[]');
      } catch (error) {}
      const match = variants.find((variant) => picked.every((value) => variant.options.includes(value)));
      const url = match?.url || (isColor ? input.dataset.url : null);
      // The card's own Add to cart adds the picked pair; a sold-out pair
      // leaves the button disabled.
      const variantInput = card.querySelector('.product-variant-id');
      if (match && variantInput) {
        variantInput.value = match.id;
        const submit = card.querySelector('.hot-card__cart[type="submit"]');
        if (submit) submit.disabled = !match.available;
      }
      if (url) {
        card.querySelectorAll('[data-card-link]').forEach((link) => {
          link.href = url;
        });
      }
    };

    onTabClick = (event) => this.selectTab(event.currentTarget);

    onScroll = (event) => {
      this.updateProgress(event.currentTarget);
      this.updateArrows();
    };

    onArrowClick = (event) => {
      const track = this.activeTrack();
      if (!track) return;
      const direction = event.currentTarget.dataset.direction === 'prev' ? -1 : 1;
      const item = track.querySelector('.hot-week-picks__product');
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const itemWidth = item ? item.getBoundingClientRect().width + gap : track.clientWidth;
      const perPage = Math.max(1, Math.round(track.clientWidth / itemWidth));
      track.scrollBy({ left: direction * itemWidth * perPage, behavior: 'smooth' });
    };

    onTabKeydown = (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const currentIndex = this.tabs.indexOf(event.currentTarget);
      let nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? this.tabs.length - 1 : currentIndex;
      if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % this.tabs.length;
      this.selectTab(this.tabs[nextIndex], true);
    };

    activePanel() {
      return this.panels.find((panel) => !panel.hidden) || this.panels[0];
    }

    activeTrack() {
      return this.activePanel()?.querySelector('.hot-week-picks__products') || null;
    }

    // Both panels keep their own row and their own bar, so each is measured on
    // its own rather than only whichever tab happens to be open.
    update() {
      this.tracks.forEach((track) => this.updateProgress(track));
      this.updateArrows();
    }

    // The thumb is as long a share of the bar as the visible part of the row is
    // of its full width, and slides across the remainder as the row scrolls.
    updateProgress(track) {
      const bar = track?.parentElement?.querySelector('[data-progress]');
      if (!bar) return;

      const maxScroll = track.scrollWidth - track.clientWidth;
      bar.hidden = maxScroll <= 1;
      if (bar.hidden) return;

      const visible = track.clientWidth / track.scrollWidth;
      const travelled = track.scrollLeft / maxScroll;
      bar.style.setProperty('--hot-progress-size', `${(visible * 100).toFixed(2)}%`);
      bar.style.setProperty('--hot-progress-offset', `${(travelled * (1 - visible) * 100).toFixed(2)}%`);
    }

    updateArrows() {
      if (!this.nav) return;
      const track = this.activeTrack();
      const maxScroll = track ? track.scrollWidth - track.clientWidth : 0;
      const scrollable = maxScroll > 1;

      this.nav.hidden = !scrollable;
      if (!scrollable) return;

      this.arrows.forEach((arrow) => {
        const isPrev = arrow.dataset.direction === 'prev';
        arrow.disabled = isPrev ? track.scrollLeft <= 1 : track.scrollLeft >= maxScroll - 1;
      });
    }

    selectTab(selectedTab, moveFocus = false) {
      this.tabs.forEach((tab) => {
        const isSelected = tab === selectedTab;
        tab.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        tab.tabIndex = isSelected ? 0 : -1;
      });
      this.panels.forEach((panel) => {
        panel.hidden = panel.id !== selectedTab.getAttribute('aria-controls');
      });
      if (moveFocus) selectedTab.focus();
      // A hidden panel measures as zero, so the newly shown row is remeasured.
      this.update();
    }
  }

  customElements.define('hot-week-picks', HotWeekPicks);
}
