/**
 * Sistema de diseño de Atlas Spaces.
 *
 * Concepto: wayfinding de un coworking real — el mismo lenguaje visual de señalética
 * de piso y planos arquitectónicos: tinta grafito, acentos de verde-bosque (disponible)
 * y ocre (pendiente/atención), tipografía geométrica para títulos y monoespaciada para
 * datos/horarios (como los paneles de salida de una estación).
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1B231F',
          soft: '#3A4540',
        },
        surface: {
          DEFAULT: '#FAFAF7',
          card: '#FFFFFF',
          sunken: '#F0EFE9',
        },
        border: {
          DEFAULT: '#E2E0D6',
        },
        brand: {
          50: '#EAF2EF',
          100: '#CFE2DB',
          400: '#3E8A76',
          500: '#2F6F5F',
          600: '#255A4E',
          700: '#1D473F',
        },
        ochre: {
          50: '#FBF3E4',
          400: '#D5A342',
          500: '#C08A2E',
          600: '#9C6F22',
        },
        danger: {
          50: '#FBECEC',
          400: '#C56060',
          500: '#B14A4A',
          600: '#8E3838',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(27, 35, 31, 0.06), 0 1px 8px rgba(27, 35, 31, 0.04)',
      },
      borderRadius: {
        md2: '10px',
      },
    },
  },
  plugins: [],
};
