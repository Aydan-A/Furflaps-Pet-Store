if (!customElements.get('dress-up-steps')) {
  customElements.define(
    'dress-up-steps',
    class DressUpSteps extends HTMLElement {
      connectedCallback() {
        this.steps = Array.from(this.querySelectorAll('[data-dress-step]'));
        this.steps.forEach((step) => step.addEventListener('toggle', this.handleToggle));

        let foundOpenStep = false;
        this.steps.forEach((step) => {
          if (step.open && foundOpenStep) step.open = false;
          if (step.open) foundOpenStep = true;
        });

        this.addEventListener('change', this.handleSelect);
        this.addEventListener('click', this.handleClick);

        if (window.Shopify?.designMode) {
          this.addEventListener('shopify:block:select', this.handleBlockSelect);
        }
      }

      disconnectedCallback() {
        this.steps?.forEach((step) => step.removeEventListener('toggle', this.handleToggle));
        this.removeEventListener('change', this.handleSelect);
        this.removeEventListener('click', this.handleClick);
        this.removeEventListener('shopify:block:select', this.handleBlockSelect);
      }

      handleToggle = (event) => {
        if (!event.target.open) return;
        this.steps.forEach((step) => {
          if (step !== event.target) step.open = false;
        });
      };

      // Mirror the selected product's price and link into the step header.
      handleSelect = (event) => {
        const input = event.target.closest('.dress-steps-card__input');
        if (!input) return;

        const step = input.closest('[data-dress-step]');
        const price = step?.querySelector('[data-dress-price]');
        if (!price) return;

        price.textContent = input.dataset.price;
        price.href = input.dataset.url;
        price.setAttribute('aria-label', `${price.dataset.viewLabel} ${input.dataset.title}`);
      };

      // The price link and continue button sit inside <summary>, which would
      // otherwise open or close the step when they are activated.
      handleClick = (event) => {
        const button = event.target.closest('[data-dress-continue]');
        if (button) {
          event.preventDefault();
          this.continueFrom(button.closest('[data-dress-step]'));
          return;
        }

        const price = event.target.closest('[data-dress-price]');
        if (!price || event.metaKey || event.ctrlKey || event.shiftKey) return;

        event.preventDefault();
        window.location.href = price.href;
      };

      continueFrom(step) {
        const next = this.steps[this.steps.indexOf(step) + 1];

        // Last step: send the visitor to the product they selected.
        if (!next) {
          const selected = step.querySelector('.dress-steps-card__input:checked');
          if (selected) window.location.href = selected.dataset.url;
          return;
        }

        next.open = true;
        next.querySelector('.dress-up-steps__summary')?.focus();
      }

      handleBlockSelect = (event) => {
        const step = event.target.closest('[data-dress-step]');
        if (step) step.open = true;
      };
    },
  );
}
