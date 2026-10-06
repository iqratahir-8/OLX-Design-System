import type { Preview } from '@storybook/react';
import '../css/olx.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // Theme comes from the toolbar below (data-theme), so the backgrounds addon is off.
    backgrounds: { disable: true },
    layout: 'padded',
    options: {
      storySort: { order: ['Overview', 'Foundations', 'Components', 'Pages', 'Flows'] },
    },
  },
  globalTypes: {
    theme: {
      description: 'OLX theme',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, context) => {
      document.documentElement.setAttribute('data-theme', context.globals.theme ?? 'light');
      return Story();
    },
  ],
};

export default preview;
