/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcdaff',
          300: '#8ec2ff',
          400: '#589fff',
          500: '#2f7dff',
          600: '#175ef5',
          700: '#124adf',
          800: '#153eb4',
          900: '#17398d',
        },
      },
    },
  },
  plugins: [],
};
