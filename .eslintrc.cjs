const path = require('path')

module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier',
    'plugin:tailwindcss/recommended',
  ],
  ignorePatterns: [
    'dist',
    'build',
    '.eslintrc.cjs',
    'node_modules',
    '.prettierrc',
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: {
    react: { version: '19.2' },
    tailwindcss: {
      // Absolute, not 'tailwind.config.js'. eslint-plugin-tailwindcss derives the
      // package-resolution directory from dirname() of this value, and a relative
      // path yields '.', which under pnpm's symlinked node_modules resolves from
      // the plugin's own nested location instead of the project root — the rules
      // then die with "Could not resolve tailwindcss". npm's flat layout hid this.
      config: path.join(__dirname, 'tailwind.config.js'),
      callees: ['classnames', 'clsx', 'ctl', 'cn'],
    },
    'jsx-a11y': {
      components: {
        // Map custom components to semantic HTML elements
        GenericCard: 'div',
        ResponsiveImage: 'img',
        SpeakerCard: 'article',
        SessionCard: 'article',
        DevTeamCard: 'article',
      },
    },
  },
  plugins: ['react-refresh', 'jsx-a11y'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],

    'tailwindcss/no-custom-classname': 'off',
    'tailwindcss/classnames-order': 'off',
    // Throws on certain AST nodes when combined with jsx-a11y linting.
    'tailwindcss/no-contradicting-classname': 'off',

    // Critical accessibility rules - set to error level
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/anchor-has-content': 'error',
    'jsx-a11y/anchor-is-valid': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-proptypes': 'error',
    'jsx-a11y/aria-role': 'error',
    'jsx-a11y/aria-unsupported-elements': 'error',
    'jsx-a11y/click-events-have-key-events': 'error',
    'jsx-a11y/heading-has-content': 'error',
    'jsx-a11y/html-has-lang': 'error',
    'jsx-a11y/iframe-has-title': 'error',
    'jsx-a11y/img-redundant-alt': 'error',
    'jsx-a11y/no-access-key': 'error',
    'jsx-a11y/no-autofocus': 'error',
    'jsx-a11y/no-distracting-elements': 'error',
    'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
    'jsx-a11y/no-noninteractive-element-interactions': 'error',
    'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',
    'jsx-a11y/no-noninteractive-tabindex': 'error',
    'jsx-a11y/no-redundant-roles': 'error',
    'jsx-a11y/no-static-element-interactions': 'error',
    'jsx-a11y/role-has-required-aria-props': 'error',
    'jsx-a11y/role-supports-aria-props': 'error',
    'jsx-a11y/scope': 'error',
    'jsx-a11y/tabindex-no-positive': 'error',

    // Additional helpful rules
    'jsx-a11y/accessible-emoji': 'warn',
    'jsx-a11y/aria-activedescendant-has-tabindex': 'warn',
    'jsx-a11y/media-has-caption': 'warn',
  },
  globals: {
    __dirname: true,
  },
  overrides: [
    {
      files: ['scripts/**/*.{js,mjs,cjs}'],
      env: { node: true },
    },
    {
      files: ['src/components/sessions/VenueMaps.jsx'],
      rules: {
        // WCAG: keyboard users must focus the overflow strip; APG scroll regions use tabindex on non-widgets
        'jsx-a11y/no-noninteractive-tabindex': 'off',
      },
    },
  ],
}
