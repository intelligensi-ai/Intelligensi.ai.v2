export type ThemeMode = 'light' | 'dark';

interface ColorPalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

interface ThemeColors {
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  background: {
    primary: string;
    secondary: string;
    accent: string;
  };
  border: {
    light: string;
    default: string;
    dark: string;
  };
  primary: ColorPalette;
  secondary: ColorPalette;
  accent: ColorPalette;
  neutral: ColorPalette;
}

export interface WebsitePreviewTheme {
  mode: ThemeMode;
  colors: ThemeColors;
  transitions: {
    default: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

const lightColors: ThemeColors = {
  text: {
    primary: '#1f2937',
    secondary: '#4b5563',
    muted: '#6b7280',
  },
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    accent: '#f3f4f6',
  },
  border: {
    light: '#e5e7eb',
    default: '#d1d5db',
    dark: '#9ca3af',
  },
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  accent: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
};

const darkColors: ThemeColors = {
  text: {
    primary: '#f9fafb',
    secondary: '#d1d5db',
    muted: '#9ca3af',
  },
  background: {
    primary: '#111827',
    secondary: '#1f2937',
    accent: '#374151',
  },
  border: {
    light: '#4b5563',
    default: '#6b7280',
    dark: '#9ca3af',
  },
  ...lightColors, // Reuse color palettes but override text/background/border
};

export const websitePreviewTheme = (mode: ThemeMode = 'light'): WebsitePreviewTheme => ({
  mode,
  colors: mode === 'light' ? lightColors : darkColors,
  transitions: {
    default: 'all 0.2s ease-in-out',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
});
