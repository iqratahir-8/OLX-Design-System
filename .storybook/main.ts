import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  // The kit and Storybook serve the same files, so the pages can't drift apart.
  staticDirs: [
    { from: '../design-kit/templates', to: '/templates' },
    { from: '../css', to: '/css' },
    { from: '../tokens', to: '/tokens' },
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
