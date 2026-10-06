import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: { children: 'Featured', variant: 'featured' },
  argTypes: { variant: { control: 'select', options: [undefined, 'featured', 'accent', 'info', 'success', 'danger'] } },
};
export default meta;

type Story = StoryObj<typeof Badge>;

export const Featured: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <Badge>Default</Badge>
      <Badge variant="featured">Featured</Badge>
      <Badge variant="accent">10,000+ Results</Badge>
      <Badge variant="info">New</Badge>
      <Badge variant="success">Verified</Badge>
      <Badge variant="danger">Sold</Badge>
    </div>
  ),
};
