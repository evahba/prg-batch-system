import postcssOklabFunction from '@csstools/postcss-oklab-function'

export default {
  plugins: [
    postcssOklabFunction({ preserve: true }),
  ],
}
