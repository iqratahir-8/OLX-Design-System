import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  args: { children: 'Post ad', variant: 'primary', size: 'default', disabled: false, block: false },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'accent', 'ghost', 'danger'] },
    size: { control: 'select', options: ['default', 'sm'] },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary', children: 'Cancel' } };
export const Accent: Story = { args: { variant: 'accent', children: 'Sell' } };
export const Ghost: Story = { args: { variant: 'ghost', children: 'View more' } };
export const Danger: Story = { args: { variant: 'danger', children: 'Delete ad' } };
export const Disabled: Story = { args: { disabled: true } };

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Button size="sm">Small</Button>
      <Button>Default</Button>
    </div>
  ),
};
