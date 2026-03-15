/**
 * @filename: lint-staged.config.mjs
 * @type {import('lint-staged').Configuration}
 */
export default {
  '*.{js,ts}': ['eslint --fix', 'prettier --write'],
  '!(*.js|*.ts)': ['prettier --write'],
};
