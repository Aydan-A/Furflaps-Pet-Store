if (!customElements.get('hot-this-week')) {
  class HotThisWeek extends HTMLElement {
    connectedCallback() {
      this.tabs = Array.from(this.querySelectorAll('[role="tab"]'));
      this.panels = Array.from(this.querySelectorAll('[role="tabpanel"]'));
      this.tabs.forEach((tab) => {
        tab.addEventListener('click', this.onTabClick);
        tab.addEventListener('keydown', this.onTabKeydown);
      });
    }

    disconnectedCallback() {
      this.tabs?.forEach((tab) => {
        tab.removeEventListener('click', this.onTabClick);
        tab.removeEventListener('keydown', this.onTabKeydown);
      });
    }

    onTabClick = (event) => this.selectTab(event.currentTarget);

    onTabKeydown = (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const currentIndex = this.tabs.indexOf(event.currentTarget);
      let nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? this.tabs.length - 1 : currentIndex;
      if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % this.tabs.length;
      this.selectTab(this.tabs[nextIndex], true);
    };

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
    }
  }

  customElements.define('hot-this-week', HotThisWeek);
}
