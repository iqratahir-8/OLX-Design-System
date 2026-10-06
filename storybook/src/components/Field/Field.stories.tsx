import type { Meta, StoryObj } from '@storybook/react';
import { Field } from './Field';

const meta: Meta<typeof Field> = {
  title: 'Components/Field',
  component: Field,
  tags: ['autodocs'],
  args: { label: 'Ad title', placeholder: 'e.g. iPhone 15 Pro, 256GB', hint: 'Mention the key features of your item.' },
};
export default meta;

type Story = StoryObj<typeof Field>;

export const Default: Story = {};
export const WithError: Story = { args: { error: 'Please enter a title', hint: undefined } };
export const Disabled: Story = { args: { disabled: true } };
