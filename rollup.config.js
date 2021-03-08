import resolve from '@rollup/plugin-node-resolve'
import commonJS from '@rollup/plugin-commonjs'

export default {
  input: 'src/vendor.js',
  output: {
    file: 'app/scripts/vendor.js',
  },
  plugins: [
    resolve(),
    commonJS()
  ]
}
