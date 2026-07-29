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

        if (window.Shopify?.designMode) {
          this.addEventListener('shopify:block:select', this.handleBlockSelect);
        }
      }

      disconnectedCallback() {
        this.steps?.forEach((step) => step.removeEventListener('toggle', this.handleToggle));
        this.removeEventListener('shopify:block:select', this.handleBlockSelect);
      }

      handleToggle = (event) => {
        if (!event.target.open) return;
        this.steps.forEach((step) => {
          if (step !== event.target) step.open = false;
        });
      };

      handleBlockSelect = (event) => {
        const step = event.target.closest('[data-dress-step]');
        if (step) step.open = true;
      };
    },
  );
}
