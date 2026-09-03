/*
 * "Pick - Pair - Play!" product builder.
 *
 * One custom element owns the whole flow. There is a single state tree:
 *
 *   steps[]  { index, required, max, completed, cards[], textInput, ... }
 *   cards[]  { productId, variants[], selectedOptions[], quantity, selected }
 *
 * Every interaction mutates that state and then calls render(), which is the
 * only place that touches the DOM. Nothing is read back out of the markup, so
 * prices, summaries, the cart payload and the open step can never disagree.
 */
if (!customElements.get('dress-up-steps')) {
  customElements.define(
    'dress-up-steps',
    class DressUpSteps extends HTMLElement {
      connectedCallback() {
        this.pickCounter = 0;
        this.steps = Array.from(this.querySelectorAll('[data-dress-step]')).map((el, index) => {
          const step = {
            el,
            index,
            panel: el.querySelector('[data-dress-panel]'),
            track: el.querySelector('[data-dress-track]'),
            toggle: el.querySelector('[data-dress-toggle]'),
            pill: el.querySelector('[data-dress-pill]'),
            pillText: el.querySelector('[data-dress-pill-text]'),
            pillImage: el.querySelector('[data-dress-pill-image]'),
            priceEl: el.querySelector('[data-dress-price]'),
            saveButton: el.querySelector('[data-dress-save]'),
            checkoutButton: el.querySelector('[data-dress-checkout]'),
            errorEl: el.querySelector('[data-dress-error]'),
            textInput: el.querySelector('[data-dress-text]'),
            arrows: Array.from(el.querySelectorAll('[data-dress-scroll]')),
            required: el.hasAttribute('data-required'),
            isFinal: el.hasAttribute('data-final'),
            max: Math.max(1, Number(el.dataset.max) || 1),
            completed: false,
          };
          step.cards = Array.from(el.querySelectorAll('[data-dress-card]')).map((cardEl) => this.buildCard(cardEl, step));
          return step;
        });

        this.removeEventListener('click', this.handleClick);
        this.removeEventListener('input', this.handleInput);
        window.removeEventListener('resize', this.handleResize);
        this.addEventListener('click', this.handleClick);
        this.addEventListener('input', this.handleInput);
        window.addEventListener('resize', this.handleResize);

        if (window.Shopify?.designMode) {
          this.addEventListener('shopify:block:select', this.handleBlockSelect);
        }

        this.steps.forEach((step) => {
          if (!step.track) return;
          step.onScroll = () => this.renderArrows(step);
          step.track.addEventListener('scroll', step.onScroll, { passive: true });
        });

        this.open(0);
        this.render();
      }

      disconnectedCallback() {
        this.removeEventListener('click', this.handleClick);
        this.removeEventListener('input', this.handleInput);
        this.removeEventListener('shopify:block:select', this.handleBlockSelect);
        window.removeEventListener('resize', this.handleResize);
        this.steps.forEach((step) => step.track?.removeEventListener('scroll', step.onScroll));
      }

      buildCard(el, step) {
        let variants = [];
        try {
          variants = JSON.parse(el.querySelector('[data-dress-variants]')?.textContent || '[]');
        } catch (error) {
          variants = [];
        }

        let selectedOptions = [];
        try {
          selectedOptions = JSON.parse(el.dataset.selectedOptions || '[]');
        } catch (error) {
          selectedOptions = variants[0]?.options?.slice() || [];
        }

        const card = {
          el,
          step,
          variants,
          selectedOptions,
          productId: el.dataset.productId,
          title: el.dataset.productTitle,
          defaultImage: el.dataset.defaultImage || '',
          image: el.dataset.defaultImage || '',
          pickButton: el.querySelector('[data-dress-pick]'),
          imageEl: el.querySelector('.ds-card__image'),
          quantityValue: el.querySelector('[data-dress-quantity-value]'),
          optionButtons: Array.from(el.querySelectorAll('[data-dress-option]')),
          quantity: 1,
          selected: false,
          order: 0,
        };

        return card;
      }

      /* ----- derived state ----- */

      // The variant matching every option the customer has chosen on this card.
      variantFor(card) {
        if (!card.variants.length) return null;
        const match = card.variants.find((variant) =>
          card.selectedOptions.every((value, index) => variant.options[index] === value)
        );
        return match || card.variants[0];
      }

      selectionsFor(step) {
        return step.cards.filter((card) => card.selected).sort((a, b) => a.order - b.order);
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
      // save button of its own, so pressing the CTA confirms it.
      isConfirmed(step) {
        return step.isFinal ? this.isValid(step) : step.completed;
      }

      canOpen(index) {
        return this.steps.slice(0, index).every((step) => !step.required || this.isValid(step));
      }

      total() {
        return this.steps.reduce(
          (sum, step) =>
            sum +
            this.selectionsFor(step).reduce(
              (stepSum, card) => stepSum + (this.variantFor(card)?.price || 0) * card.quantity,
              0
            ),
          0
        );
      }

      /* ----- rendering ----- */

      render() {
        const money = this.formatMoney(this.total());
        const ready = this.steps.every((step) => !step.required || this.isConfirmed(step));

        this.steps.forEach((step) => {
          const isOpen = !step.panel.hidden;
          const selections = this.selectionsFor(step);

          // The open step owns the price and the button; a closed row shows
          // its pill instead. CSS hides the actions, so they never flash
          // before this runs.
          step.el.classList.toggle('ds-step--open', isOpen);

          if (step.priceEl) step.priceEl.textContent = money;
          step.toggle?.setAttribute('aria-disabled', String(!this.canOpen(step.index)));
          if (step.saveButton) step.saveButton.setAttribute('aria-disabled', String(!this.isValid(step)));
          if (step.checkoutButton) step.checkoutButton.setAttribute('aria-disabled', String(!ready));

          this.renderPill(step, isOpen, selections);
          // At the cap, the cards you cannot add read as unavailable rather
          // than looking pickable and refusing.
          const atLimit = step.max > 1 && selections.length >= step.max;
          step.cards.forEach((card) => this.renderCard(card, atLimit));
          this.renderArrows(step);
        });
      }

      renderCard(card, atLimit) {
        card.el.classList.toggle('ds-card--selected', card.selected);
        card.el.classList.toggle('ds-card--blocked', Boolean(atLimit) && !card.selected);
        card.pickButton?.setAttribute('aria-pressed', String(card.selected));
        if (card.quantityValue) card.quantityValue.textContent = card.quantity;

        card.optionButtons.forEach((button) => {
          const index = Number(button.dataset.optionIndex);
          const value = button.dataset.value;
          const chosen = card.selectedOptions[index] === value;
          const available = card.variants.some(
            (item) =>
              item.available &&
              item.options[index] === value &&
              card.selectedOptions.every((option, i) => i === index || item.options[i] === option)
          );

          button.setAttribute('aria-pressed', String(chosen));
          button.classList.toggle('ds-card__value--active', chosen);
          button.classList.toggle('ds-card__value--unavailable', !available);
        });
      }

      renderPill(step, isOpen, selections) {
        if (!step.pill || !step.pillText) return;

        const text = this.textFor(step);
        const parts = selections.map((card) => {
          const variant = this.variantFor(card);
          const options = (variant?.options || []).filter((value) => value && value !== 'Default Title');
          const label = [card.title, options.join(' / ')].filter(Boolean).join(' — ');
          return card.quantity > 1 ? `${label} × ${card.quantity}` : label;
        });
        if (text) parts.unshift(text);

        step.pill.hidden = isOpen || !parts.length;
        if (step.pill.hidden) return;

        step.pillText.textContent = parts.join(' / ');
        // A step can be summarised by its text alone, with nothing picked yet.
        const first = selections[0];
        const image = first?.image;
        if (step.pillImage) {
          step.pillImage.hidden = !image;
          if (image) step.pillImage.src = image;
        }
      }

      renderArrows(step) {
        if (!step.arrows.length || !step.track) return;
        const maxScroll = step.track.scrollWidth - step.track.clientWidth - 1;
        const scrollable = maxScroll > 0;
        step.arrows.forEach((arrow) => {
          const forward = Number(arrow.dataset.dressScroll) > 0;
          arrow.disabled = !scrollable || (forward ? step.track.scrollLeft >= maxScroll : step.track.scrollLeft <= 0);
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
          if (step.panel) step.panel.hidden = !isOpen;
          step.toggle?.setAttribute('aria-expanded', String(isOpen));
          if (isOpen) this.clearError(step);
        });
      }

      // A change in one step can never leave a later step "completed".
      invalidateFrom(index) {
        this.steps.forEach((step) => {
          if (step.index >= index) step.completed = false;
        });
      }

      showError(step, message) {
        if (!step.errorEl || !message) return;
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
        const target = (selector) => event.target.closest(selector);

        const toggle = target('[data-dress-toggle]');
        if (toggle) return this.onToggle(this.stepFor(toggle));

        const edit = target('[data-dress-edit]');
        if (edit) return this.onEdit(this.stepFor(edit));

        const pick = target('[data-dress-pick]');
        if (pick) return this.onPick(this.cardFor(pick));

        const option = target('[data-dress-option]');
        if (option) return this.onOption(this.cardFor(option), option);

        const quantity = target('[data-dress-quantity-change]');
        if (quantity) return this.onQuantity(this.cardFor(quantity), Number(quantity.dataset.dressQuantityChange));

        const arrow = target('[data-dress-scroll]');
        if (arrow) return this.onScrollButton(this.stepFor(arrow), Number(arrow.dataset.dressScroll));

        const save = target('[data-dress-save]');
        if (save) return this.onSave(this.stepFor(save));

        const checkout = target('[data-dress-checkout]');
        if (checkout) return this.onCheckout(checkout);
      };

      handleInput = (event) => {
        if (!event.target.matches('[data-dress-text]')) return;
        const step = this.stepFor(event.target);
        this.invalidateFrom(step.index);
        this.clearError(step);
        this.render();
      };

      // How many cards fit changes with the viewport, and with it whether the
      // arrows have anywhere left to go.
      handleResize = () => this.steps.forEach((step) => this.renderArrows(step));

      handleBlockSelect = (event) => {
        const step = this.stepFor(event.target);
        if (step) {
          this.open(step.index);
          this.render();
        }
      };

      stepFor(element) {
        const el = element.closest('[data-dress-step]');
        return this.steps.find((step) => step.el === el);
      }

      cardFor(element) {
        const step = this.stepFor(element);
        const el = element.closest('[data-dress-card]');
        return step.cards.find((card) => card.el === el);
      }

      onToggle(step) {
        if (step.toggle.getAttribute('aria-expanded') === 'true') return;
        if (!this.canOpen(step.index)) return this.showError(step, this.dataset.lockedMessage);

        step.completed = false;
        this.open(step.index);
        this.render();
      }

      onEdit(step) {
        this.onToggle(step);
        step.toggle.focus();
      }

      onPick(card) {
        const step = card.step;

        if (card.selected) {
          card.selected = false;
        } else {
          const selected = this.selectionsFor(step);
          if (step.max === 1) {
            selected.forEach((other) => (other.selected = false));
          } else if (selected.length >= step.max) {
            return this.showError(step, (this.dataset.limitMessage || '').replace('{max}', step.max));
          }
          card.selected = true;
          card.order = ++this.pickCounter;
          card.quantity = card.quantity || 1;
        }

        this.clearError(step);
        this.invalidateFrom(step.index);
        this.render();
      }

      // Choosing an option keeps the card on a real variant: if the combination
      // the customer built does not exist, the rest of the options move to the
      // first variant that does carry the value they just picked.
      onOption(card, button) {
        const index = Number(button.dataset.optionIndex);
        const value = button.dataset.value;
        const next = card.selectedOptions.slice();
        next[index] = value;

        const exact = card.variants.find((variant) => next.every((option, i) => variant.options[i] === option));
        if (!exact || !exact.available) {
          const fallback =
            card.variants.find((variant) => variant.available && variant.options[index] === value) ||
            card.variants.find((variant) => variant.options[index] === value);
          if (fallback) next.splice(0, next.length, ...fallback.options);
        }

        card.selectedOptions = next;
        this.showVariantImage(card);
        this.clearError(card.step);
        this.invalidateFrom(card.step.index);
        this.render();
      }

      // Only an option change can move a card onto another variant, so the
      // image swap lives here. Until a customer picks something, the card keeps
      // the product's own featured image, with the responsive srcset Liquid
      // rendered for it.
      showVariantImage(card) {
        const image = this.variantFor(card)?.image || card.defaultImage;
        if (!card.imageEl || !image || image === card.image) return;

        card.image = image;
        card.imageEl.removeAttribute('srcset');
        card.imageEl.src = image;
      }

      onQuantity(card, change) {
        card.quantity = Math.max(1, card.quantity + change);
        this.invalidateFrom(card.step.index);
        this.render();
      }

      // Move to the next page boundary rather than by a fixed distance. The
      // last page is short whenever the cards do not divide evenly, so a plain
      // scrollBy would step back from it by a full page and skip one.
      onScrollButton(step, direction) {
        const card = step.track?.querySelector('[data-dress-card]');
        if (!card) return;

        const gap = parseFloat(getComputedStyle(step.track).columnGap) || 0;
        const stride = card.offsetWidth + gap;
        const page = stride * Math.max(1, Math.round(step.track.clientWidth / stride));
        const from = step.track.scrollLeft;
        const target = direction > 0 ? Math.ceil((from + 1) / page) : Math.floor((from - 1) / page);

        step.track.scrollTo({ left: Math.max(0, target) * page, behavior: 'smooth' });
      }

      onSave(step) {
        if (!this.isValid(step)) {
          // Point at whatever is actually missing rather than just refusing.
          if (!this.selectionsFor(step).length) {
            step.el.querySelector('[data-dress-pick]:not(:disabled)')?.focus();
          } else if (step.textInput && !this.textFor(step)) {
            step.textInput.setAttribute('aria-invalid', 'true');
            step.textInput.focus();
          }
          return this.showError(step, this.dataset.errorMessage);
        }

        this.clearError(step);
        step.completed = true;

        const next = this.steps[step.index + 1];
        if (next) {
          this.open(next.index);
          next.toggle.focus();
        } else {
          this.open(-1);
        }
        this.render();
      }

      /* ----- add to cart ----- */

      buildItems() {
        return this.steps.reduce((items, step) => {
          if (!this.isConfirmed(step)) return items;

          const properties = {};
          const text = this.textFor(step);
          if (text && step.textInput?.dataset.property) properties[step.textInput.dataset.property] = text;

          // Every pick is its own cart line, with its own variant and quantity.
          this.selectionsFor(step).forEach((card) => {
            const variant = this.variantFor(card);
            if (!variant) return;
            items.push({
              id: variant.id,
              quantity: card.quantity,
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
          this.render();
          return this.showError(incomplete, this.dataset.errorMessage);
        }

        const items = this.buildItems();
        if (!items.length) return this.showError(step, this.dataset.errorMessage);

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

          // Fall back to the cart page when the theme has no drawer.
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
    },
  );
}
