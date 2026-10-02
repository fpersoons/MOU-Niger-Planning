/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Montserrat', 'system-ui', 'sans-serif'] },
      colors: {
        chem: {
          blue:       '#00B7F1', 'blue-60': '#66D4F7', 'blue-40': '#99E2F9', 'blue-20': '#CCF1FC', 'blue-10': '#E6F8FE',
          darkblue:   '#005D83', 'darkblue-60': '#669EB5', 'darkblue-40': '#99BECD', 'darkblue-20': '#CCDFE6',
          gray1:      '#333E48', 'gray1-60': '#858B91', 'gray1-40': '#ADB2B6', 'gray1-20': '#D6D8DA', 'gray1-10': '#EBECED', 'gray1-5': '#F5F7F8',
          gray2:      '#56565A', 'gray2-60': '#9A9A9C', 'gray2-40': '#BBBBBD', 'gray2-20': '#DDDDDE',
          green1:     '#D0DD27', 'green1-75': '#DCE65D', 'green1-50': '#E8EE93', 'green1-25': '#F3F7C9',
          green2:     '#9CB92D', 'green2-60': '#C4D581', 'green2-40': '#D7E3AB', 'green2-20': '#EBF1D5',
          aqua:       '#00A095', darkaqua: '#007468',
          darkgreen1: '#758111', darkgreen2: '#377225',
          yellow:     '#FEBE10', orange1: '#F6871F', orange2: '#F0532D', 'orange2-15': '#FDE0D8',
          eggplant:   '#7B0046',
        },
      },
    },
  },
  plugins: [],
};
