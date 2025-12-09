class ThemeToggle extends HTMLElement {
  constructor() {
    super();
    // Initialize state
    this.theme = 'pinky'; 
  }

  connectedCallback() {
    // 1. Initialize logic (checking local storage/system pref)
    this.initializeTheme();
    
    // 2. Render the HTML
    this.render();

    // 3. Cache DOM elements so we don't query them every time we click
    this.btn = this.querySelector('button');
    this.dot = this.querySelector('.theme-dot');
    this.text = this.querySelector('.theme-text');

    // 4. Add Event Listener
    // Note: We bind 'this' so the function can access the class properties
    this.btn.addEventListener('click', this.toggleTheme.bind(this));
  }

  initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
      this.theme = savedTheme;
    } else if (systemPrefersDark) {
      this.theme = 'dark';
    }

    // Apply the theme immediately so the UI is correct on first render
    this.applyThemeToDocument();
  }

  toggleTheme() {
    // Flip the state
    this.theme = this.theme === 'pinky' ? 'dark' : 'pinky';
    
    // Save and Apply
    localStorage.setItem('theme', this.theme);
    this.applyThemeToDocument();
    
    // Update the button visuals
    this.updateUI();
  }

  applyThemeToDocument() {
    // 1. Support for [data-theme="dark"] selectors
    document.documentElement.setAttribute('data-theme', this.theme);
    
    // 2. Support for Tailwind v4 (.dark class)
    if (this.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  updateUI() {
    // Manually update classes/text to avoid re-rendering the whole HTML
    if (this.theme === 'dark') {
      this.dot.classList.remove('scale-0');
      this.dot.classList.add('scale-100');
      this.text.textContent = 'Dark';
    } else {
      this.dot.classList.remove('scale-100');
      this.dot.classList.add('scale-0');
      this.text.textContent = 'Pinky';
    }
  }

  render() {
    // This uses "Light DOM" so your Tailwind classes work instantly.
    this.innerHTML = `
      <button 
        type="button"
        class="flex items-center gap-2 text-sm min-w-[65px] font-light tracking-wider hover:text-accent-red transition-colors cursor-pointer"
        aria-label="Toggle theme"
      >
        <span class="w-4 h-4 rounded-full border border-current flex items-center justify-center">
          <span class="theme-dot w-2 h-2 rounded-full bg-accent-red transition-transform duration-300 ${this.theme === 'dark' ? 'scale-100' : 'scale-0'}"></span>
        </span>
        <span class="theme-text">${this.theme === 'dark' ? 'Dark' : 'Pinky'}</span>
      </button>
    `;
  }
}

customElements.define('theme-toggle', ThemeToggle);
