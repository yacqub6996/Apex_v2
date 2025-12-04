type Theme = 'light' | 'dark' | 'system';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

// Simple theme store using localStorage and event listeners
class ThemeStoreImpl {
  private theme: Theme = 'system';
  private resolvedTheme: 'light' | 'dark' = 'light';
  private listeners: Array<(store: ThemeStore) => void> = [];

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined') return;

    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme-storage');
    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme);
        this.theme = parsed.state?.theme || 'system';
      } catch {
        this.theme = 'system';
      }
    }

    this.updateResolvedTheme();
    this.applyTheme();

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.theme === 'system') {
        this.updateResolvedTheme();
        this.applyTheme();
        this.notifyListeners();
      }
    });
  }

  private updateResolvedTheme() {
    this.resolvedTheme = this.theme === 'system' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : this.theme;
  }

  private applyTheme() {
    const root = document.documentElement;
    if (this.theme === 'system') {
      root.classList.remove('dark-mode', 'light-mode');
      root.classList.add(this.resolvedTheme === 'dark' ? 'dark-mode' : 'light-mode');
    } else {
      root.classList.remove('dark-mode', 'light-mode');
      root.classList.add(this.theme === 'dark' ? 'dark-mode' : 'light-mode');
    }
  }

  private notifyListeners() {
    const store = this.getStore();
    this.listeners.forEach(listener => listener(store));
  }

  getStore(): ThemeStore {
    return {
      theme: this.theme,
      resolvedTheme: this.resolvedTheme,
      setTheme: this.setTheme.bind(this),
    };
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    this.updateResolvedTheme();
    this.applyTheme();

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme-storage', JSON.stringify({
        state: { theme },
        version: 0,
      }));
    }

    this.notifyListeners();
  }

  subscribe(listener: (store: ThemeStore) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
}

// Create singleton instance
const themeStore = new ThemeStoreImpl();

// Export hook for React components
export const useThemeStore = () => {
  return themeStore.getStore();
};

// Export for direct access if needed
export { themeStore };