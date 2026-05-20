import { create } from 'zustand';

const STORAGE_KEY = 'reaglex-commerce-theme';

function applyCommerceTheme(mode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.add('no-transition');
  root.setAttribute('data-commerce-theme', mode);
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove('no-transition'));
  });
}

export const useCommerceTheme = create((set, get) => ({
  mode: (() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s === 'ambient' || s === 'cinema') return s;
    } catch {
      /* ignore */
    }
    return 'cinema';
  })(),
  followSystem: false,
  accent: 'orange',
  blurIntensity: 72,
  motionIntensity: 80,
  density: 'comfortable',

  setMode: (mode) => {
    applyCommerceTheme(mode);
    set({ mode });
  },

  toggleMode: () => {
    const next = get().mode === 'cinema' ? 'ambient' : 'cinema';
    get().setMode(next);
  },

  setFollowSystem: (followSystem) => set({ followSystem }),
  setAccent: (accent) => set({ accent }),
  setBlurIntensity: (blurIntensity) => set({ blurIntensity }),
  setMotionIntensity: (motionIntensity) => set({ motionIntensity }),
  setDensity: (density) => set({ density }),
}));

if (typeof document !== 'undefined') {
  applyCommerceTheme(useCommerceTheme.getState().mode);
}
