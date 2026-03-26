import postcssOklabFunction from '@csstools/postcss-oklab-function'
import postcssCascadeLayers from '@csstools/postcss-cascade-layers'
import postcssColorMixFunction from '@csstools/postcss-color-mix-function'

export default {
  plugins: [
    postcssCascadeLayers(),
    postcssColorMixFunction({ preserve: true }),
    postcssOklabFunction({ preserve: true }),
  ],
}
