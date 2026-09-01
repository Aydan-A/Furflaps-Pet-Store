/*
 * "Pick - Pair - Play!" builder.
 *
 * State model: one entry per step, derived from the DOM on every change.
 *   - selections: the checked product inputs, in the order the customer picked
 *     them (a step can allow several, e.g. the letters of a name)
 *   - valid:     required selection present, plus required personalization text
 *   - completed: the customer pressed "Save and continue" while valid
 * Changing a step clears `completed` for every later step but keeps their
 * selections, so nothing can stay falsely completed.
 */
if (!customElements.get('dress-up-steps')) {
  customElements.define(
    'dress-up-steps',
    class DressUpSteps extends HTMLElement {
      connectedCallback() {
        this.steps = Array.from(this.querySelectorAll('[data-dress-step]')).map((el, index) => ({
          el,
          index,
          panel: el.querySelector('[data-dress-panel]'),
          toggle: el.querySelector('[data-dress-toggle]'),
          saveButton: el.querySelector('[data-dress-save]'),
          checkoutButton: el.querySelector('[data-dress-checkout]'),
          priceEl: el.querySelector('[data-dress-price]'),
          pill: el.querySelector('[data-dress-pill]'),
          pillText: el.querySelector('[data-dress-pill-text]'),
          pillImage: el.querySelector('[data-dress-pill-image]'),
          errorEl: el.querySelector('[data-dress-error]'),
          textInput: el.querySelector('[data-dress-text]'),
          swatches: el.querySelector('[data-dress-swatches]'),
          required: el.hasAttribute('data-required'),
          isFinal: el.hasAttribute('data-final'),
          completed: false,
        }));

        this.addEventListener('click', this.handleClick);
        this.addEventListener('change', this.handleChange);
        this.addEventListener('input', this.handleInput);
        this.addEventListener('pointerdown', this.handlePointerDown);
        this.addEventListener('keydown', this.handleKeyDown);

        if (window.Shopify?.designMode) {
          this.addEventListener('shopify:block:select', this.handleBlockSelect);
        }

        this.open(0);
        this.render();
      }

      disconnectedCallback() {
        this.removeEventListener('click', this.handleClick);
        this.removeEventListener('change', this.handleChange);
        this.removeEventListener('input', this.handleInput);
        this.removeEventListener('pointerdown', this.handlePointerDown);
        this.removeEventListener('keydown', this.handleKeyDown);
        this.removeEventListener('shopify:block:select', this.handleBlockSelect);
      }

      /* ----- reading state ----- */

      stepFor(element) {
        const el = element.closest('[data-dress-step]');
        return this.steps.find((step) => step.el === el);
      }

      selectionsFor(step) {
        return Array.from(step.el.querySelectorAll('[data-dress-product]:checked:not(:disabled)'))
          .map((input) => {
            const selectedVariant = input.parentElement.querySelector('[data-dress-variant]:checked');
            return {
              input,
              order: Number(input.dataset.order) || 0,
              variantId: selectedVariant?.value || input.value,
              price: Number(selectedVariant?.dataset.price || input.dataset.price) || 0,
              quantity: Number(input.dataset.quantity) || 1,
              title: [input.dataset.title, selectedVariant?.dataset.label].filter(Boolean).join(' — '),
              image: selectedVariant?.dataset.image || input.dataset.image,
            };
          })
          .sort((a, b) => a.order - b.order);
      }

      swatchFor(step) {
        const input = step.swatches?.querySelector('[data-dress-swatch]:checked');
        if (!input) return null;
        return { label: input.dataset.label, value: input.value, property: step.swatches.dataset.property };
      }

      textFor(step) {
        return step.textInput ? step.textInput.value.trim() : '';
      }

      isValid(step) {
        if (!this.selectionsFor(step).length) return !step.required;
        if (step.textInput?.hasAttribute('data-text-required') && !this.textFor(step)) return false;
        return true;
      }

      // A step counts towards the cart once it is saved. The final step has no
      // save button of its own, so pressing the CTA confirms its selection.
      isConfirmed(step) {
        return step.isFinal ? this.isValid(step) : step.completed;
      }

      canOpen(index) {
        return this.steps.slice(0, index).every((step) => !step.required || this.isValid(step));
      }

      /* ----- rendering ----- */

      render() {
        let total = 0;
        this.steps.forEach((step) => {
          this.selectionsFor(step).forEach((selection) => {
            total += selection.price * selection.quantity;
          });
        });

        const money = this.formatMoney(total);
        const ready = this.steps.every((step) => !step.required || this.isConfirmed(step));

        this.steps.forEach((step) => {
          if (step.priceEl) step.priceEl.textContent = money;
          if (step.saveButton) step.saveButton.disabled = !this.isValid(step);
          if (step.checkoutButton) step.checkoutButton.disabled = !ready;
          if (step.toggle) {
            const openable = this.canOpen(step.index);
            step.toggle.setAttribute('aria-disabled', String(!openable));
          }

          // Minimum quantity is 1.
          step.el.querySelectorAll('[data-dress-quantity]').forEach((control) => {
            const input = control.parentElement.querySelector('[data-dress-product]');
            const quantity = Number(input?.dataset.quantity) || 1;
            control.querySelector('[data-dress-quantity-value]').textContent = quantity;
            control.querySelector('[data-dress-quantity-change="-1"]').disabled = quantity <= 1;
          });
        });
      }

      // Mirrors Shopify's own money formatting so the builder total reads
      // exactly like every other price on the storefront and in the cart.
      formatMoney(cents) {
        const format = this.dataset.moneyFormat || '${{amount}}';
        const placeholder = /\{\{\s*(\w+)\s*\}\}/;
        const token = format.match(placeholder);
        if (!token) return format;

        const withDelimiters = (precision, thousands = ',', decimal = '.') => {
          const [whole, fraction] = (cents / 100).toFixed(precision).split('.');
          return whole.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, `$1${thousands}`) + (fraction ? decimal + fraction : '');
        };

        const amounts = {
          amount: () => withDelimiters(2),
          amount_no_decimals: () => withDelimiters(0),
          amount_with_comma_separator: () => withDelimiters(2, '.', ','),
          amount_no_decimals_with_comma_separator: () => withDelimiters(0, '.', ','),
          amount_with_space_separator: () => withDelimiters(2, ' ', ','),
          amount_no_decimals_with_space_separator: () => withDelimiters(0, ' ', ','),
          amount_with_apostrophe_separator: () => withDelimiters(2, "'"),
        };

        return format.replace(placeholder, (amounts[token[1]] || amounts.amount)());
      }

      /* ----- step transitions ----- */

      open(index) {
        this.steps.forEach((step) => {
          const isOpen = step.index === index;
          step.panel.hidden = !isOpen;
          step.toggle.setAttribute('aria-expanded', String(isOpen));
          step.el.classList.toggle('dress-up-steps__step--open', isOpen);
          step.el.classList.toggle('dress-up-steps__step--closed', !isOpen);
          if (isOpen) this.clearError(step);
        });
      }

      // A change in one step can never leave a later step "completed".
      invalidateAfter(index) {
        this.steps.forEach((step) => {
          if (step.index >= index) this.uncomplete(step);
        });
      }

      uncomplete(step) {
        step.completed = false;
        step.pill.hidden = true;
      }

      complete(step) {
        step.completed = true;
        this.showPill(step);

        const next = this.steps[step.index + 1];
        if (next) {
          this.open(next.index);
          next.toggle.focus();
        } else {
          this.open(-1);
        }
      }

      showPill(step) {
        const selections = this.selectionsFor(step);
        const swatch = this.swatchFor(step);
        const text = this.textFor(step);
        const parts = [text, ...selections.map((selection) => selection.title), swatch?.label].filter(Boolean);

        if (!parts.length) {
          step.pill.hidden = true;
          return;
        }

        step.pillText.textContent = parts.join(' / ');
        if (selections[0]?.image) {
          step.pillImage.src = selections[0].image;
          step.pillImage.hidden = false;
        } else {
          step.pillImage.hidden = true;
        }
        step.pill.hidden = false;
      }

      showError(step, message) {
        if (!step.errorEl) return;
        step.errorEl.textContent = message;
        step.errorEl.hidden = false;
      }

      clearError(step) {
        if (!step.errorEl) return;
        step.errorEl.hidden = true;
        step.errorEl.textContent = '';
        step.textInput?.removeAttribute('aria-invalid');
      }

      /* ----- events ----- */

      handleClick = (event) => {
        const toggle = event.target.closest('[data-dress-toggle]');
        if (toggle) return this.onToggle(this.stepFor(toggle));

        const edit = event.target.closest('[data-dress-edit]');
        if (edit) {
          const step = this.stepFor(edit);
          this.uncomplete(step);
          this.open(step.index);
          step.toggle.focus();
          return this.render();
        }

        const label = event.target.closest('.dress-steps-card__label');
        if (label) return this.onCardClick(label);

        const quantityButton = event.target.closest('[data-dress-quantity-change]');
        if (quantityButton) return this.onQuantity(quantityButton);

        const save = event.target.closest('[data-dress-save]');
        if (save) return this.onSave(this.stepFor(save));

        const checkout = event.target.closest('[data-dress-checkout]');
        if (checkout) return this.onCheckout(checkout);
      };

      // Clicking the selected card in an optional step clears it.
      onCardClick(label) {
        const input = label.parentElement.querySelector('[data-dress-product]');
        const step = this.stepFor(label);
        if (input.type === 'checkbox' || step.required || input.dataset.wasChecked !== 'true') return;

        input.checked = false;
        this.invalidateAfter(step.index);
        this.render();
      }

      handlePointerDown = (event) => {
        const label = event.target.closest('.dress-steps-card__label');
        if (!label) return;
        const input = label.parentElement.querySelector('[data-dress-product]');
        input.dataset.wasChecked = String(input.checked);
      };

      handleKeyDown = (event) => {
        if (event.key !== ' ' && event.key !== 'Spacebar') return;
        const input = event.target.closest('[data-dress-product]');
        if (!input?.checked || input.type === 'checkbox') return;

        const step = this.stepFor(input);
        if (step.required) return;

        event.preventDefault();
        input.checked = false;
        this.invalidateAfter(step.index);
        this.render();
      };

      handleChange = (event) => {
        if (!event.target.matches('[data-dress-product], [data-dress-swatch], [data-dress-variant]')) return;

        if (event.target.matches('[data-dress-variant]')) this.showVariantImage(event.target);

        if (event.target.matches('[data-dress-product]') && event.target.checked) {
          this.pickOrder = (this.pickOrder || 0) + 1;
          event.target.dataset.order = String(this.pickOrder);
        }

        const step = this.stepFor(event.target);
        this.invalidateAfter(step.index);
        this.clearError(step);
        this.render();
      };

      handleInput = (event) => {
        if (!event.target.matches('[data-dress-text]')) return;
        const step = this.stepFor(event.target);
        this.invalidateAfter(step.index);
        this.clearError(step);
        this.render();
      };

      showVariantImage(variantInput) {
        const image = variantInput.closest('.dress-steps-card')?.querySelector('.dress-steps-card__image');
        if (!image || !variantInput.dataset.imageLarge) return;

        image.srcset = '';
        image.src = variantInput.dataset.imageLarge;
      }

      onToggle(step) {
        const isOpen = step.toggle.getAttribute('aria-expanded') === 'true';
        if (isOpen) return this.open(-1);

        if (!this.canOpen(step.index)) {
          return this.showError(step, this.dataset.lockedMessage);
        }

        this.uncomplete(step);
        this.open(step.index);
        this.render();
      }

      onQuantity(button) {
        const card = button.closest('.dress-steps-card');
        const input = card.querySelector('[data-dress-product]');
        const quantity = Number(input.dataset.quantity) || 1;

        input.dataset.quantity = Math.max(1, quantity + Number(button.dataset.dressQuantityChange));
        if (!input.checked) input.checked = true;

        this.invalidateAfter(this.stepFor(button).index);
        this.render();
      }

      onSave(step) {
        if (!this.isValid(step)) {
          if (step.textInput && !this.textFor(step)) step.textInput.setAttribute('aria-invalid', 'true');
          return this.showError(step, this.dataset.errorMessage);
        }

        this.clearError(step);
        this.complete(step);
        this.render();
      }

      /* ----- add to cart ----- */

      buildItems() {
        return this.steps.reduce((items, step) => {
          if (!this.isConfirmed(step)) return items;

          const properties = {};
          const text = this.textFor(step);
          if (text && step.textInput.dataset.property) properties[step.textInput.dataset.property] = text;

          const swatch = this.swatchFor(step);
          if (swatch?.value && swatch.property) properties[swatch.property] = swatch.value;

          // A step that allows several products adds one cart line per product.
          this.selectionsFor(step).forEach((selection) => {
            items.push({
              id: selection.variantId,
              quantity: selection.quantity,
              ...(Object.keys(properties).length ? { properties } : {}),
            });
          });
          return items;
        }, []);
      }

      async onCheckout(button) {
        const step = this.stepFor(button);
        const incomplete = this.steps.find((item) => item.required && !this.isConfirmed(item));
        if (incomplete) {
          this.open(incomplete.index);
          return this.showError(incomplete, this.dataset.errorMessage);
        }

        const items = this.buildItems();
        if (!items.length) return this.showError(step, this.dataset.errorMessage);

        // The cart notification renders a single added line, so a multi-item
        // add falls back to the cart page instead.
        const cart = document.querySelector('cart-drawer');
        const body = { items };
        if (cart) {
          body.sections = cart.getSectionsToRender().map((section) => section.id);
          body.sections_url = window.location.pathname;
          cart.setActiveElement?.(document.activeElement);
        }

        this.setLoading(button, true);
        this.clearError(step);

        try {
          const config =
            typeof fetchConfig === 'function'
              ? fetchConfig('javascript')
              : { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/javascript' } };

          const response = await fetch(this.dataset.cartAddUrl, { ...config, body: JSON.stringify(body) });
          const data = await response.json();

          if (data.status) throw new Error(data.description || data.message);

          if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
            publish(PUB_SUB_EVENTS.cartUpdate, { source: 'dress-up-steps', cartData: data });
          }

          // Fall back to the cart page when the theme has no drawer or notification.
          if (cart && data.sections) {
            cart.renderContents(data);
          } else {
            window.location.href = this.dataset.cartUrl;
          }
        } catch (error) {
          this.showError(step, error.message || this.dataset.errorMessage);
        } finally {
          this.setLoading(button, false);
          this.render();
        }
      }

      setLoading(button, isLoading) {
        button.classList.toggle('is-loading', isLoading);
        button.disabled = isLoading;
        button.querySelector('[data-dress-spinner]').hidden = !isLoading;
      }

      handleBlockSelect = (event) => {
        const step = this.stepFor(event.target);
        if (step) this.open(step.index);
      };
    },
  );
}
