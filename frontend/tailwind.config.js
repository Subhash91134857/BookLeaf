/** Palette taken 1:1 from the design brief. Semantic pairs = tinted bg + dark fg. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        ink: '#172B3A',
        teal: { DEFAULT: '#0F766E', dark: '#0B5F59' },
        canvas: '#F7F8FA',
        surface: '#FFFFFF',
        line: '#E5EAF0',
        muted: '#64748B',
        critical: { bg: '#FEE2E2', fg: '#991B1B' },
        high: { bg: '#FFEDD5', fg: '#9A3412' },
        medium: { bg: '#FEF3C7', fg: '#92400E' },
        success: { bg: '#D1FAE5', fg: '#065F46' },
        info: { bg: '#DBEAFE', fg: '#1E40AF' },
        neutral: { bg: '#F1F5F9', fg: '#334155' },
      },
    },
  },
  plugins: [],
};
