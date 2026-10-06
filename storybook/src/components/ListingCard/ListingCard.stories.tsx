import type { Meta, StoryObj } from '@storybook/react';
import { ListingCard } from './ListingCard';

const meta: Meta<typeof ListingCard> = {
  title: 'Components/ListingCard',
  component: ListingCard,
  tags: ['autodocs'],
  args: {
    price: 'Rs 4.75 Lac',
    title: 'Apple iPhone 17 Pro Max',
    meta: 'Allama Iqbal Town, Lahore · 15 minutes ago',
    featured: false,
    row: false,
  },
  decorators: [(Story) => <div style={{ maxWidth: 560 }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof ListingCard>;

export const Default: Story = {};
export const Featured: Story = { args: { featured: true } };
export const Row: Story = { args: { row: true } };
