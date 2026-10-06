import type { Meta, StoryObj } from '@storybook/react';
import { Alert } from './Alert';

const meta: Meta<typeof Alert> = {
  title: 'Components/Alert',
  component: Alert,
  tags: ['autodocs'],
  args: { variant: 'info', title: 'Heads up', children: 'Your ad is under review and will go live shortly.' },
  argTypes: { variant: { control: 'select', options: ['info', 'success', 'warning', 'danger'] } },
};
export default meta;

type Story = StoryObj<typeof Alert>;

export const Info: Story = {};
export const Success: Story = { args: { variant: 'success', title: 'Ad posted', children: 'Your ad is now live.' } };
export const Warning: Story = { args: { variant: 'warning', title: 'Almost there', children: 'Add at least 3 photos.' } };
export const Danger: Story = { args: { variant: 'danger', title: 'Something went wrong', children: 'Please try again.' } };
