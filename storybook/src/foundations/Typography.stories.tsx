import type { Meta, StoryObj } from '@storybook/react';
import tokens from '../../tokens/tokens.json';

const meta: Meta = { title: 'Foundations/Typography', tags: ['autodocs'] };
export default meta;

type Story = StoryObj;

export const Scale: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12 }}>
      {Object.entries(tokens.font.size).map(([name, size]) => (
        <div key={name} style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
          <code style={{ width: 80 }}>{name}</code>
          <code style={{ width: 60 }} className="olx-text-muted">{size}</code>
          <span style={{ fontSize: size }}>Find cars, mobiles and more on OLX</span>
        </div>
      ))}
    </div>
  ),
};

export const Weights: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 8 }}>
      {Object.entries(tokens.font.weight).map(([name, weight]) => (
        <div key={name} style={{ fontWeight: Number(weight), fontSize: 18 }}>
          {name} ({weight}) — Post your ad for free
        </div>
      ))}
    </div>
  ),
};
