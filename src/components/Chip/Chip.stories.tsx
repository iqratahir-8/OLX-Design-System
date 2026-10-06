import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Chip } from './Chip';

const meta: Meta<typeof Chip> = {
  title: 'Components/Chip',
  component: Chip,
  tags: ['autodocs'],
  args: { children: 'Cars', pressed: false },
};
export default meta;

type Story = StoryObj<typeof Chip>;

export const Default: Story = {};
export const Pressed: Story = { args: { pressed: true, children: 'All' } };

export const FilterRow: Story = {
  render: () => {
    const options = ['All', 'Cars', 'Mobiles', 'Property', 'Electronics'];
    const [active, setActive] = useState('All');
    return (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {options.map((o) => (
          <Chip key={o} pressed={active === o} onClick={() => setActive(o)}>
            {o}
          </Chip>
        ))}
      </div>
    );
  },
};
