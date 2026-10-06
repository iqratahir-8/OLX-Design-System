import type { Meta, StoryObj } from '@storybook/react';
import tokens from '../../tokens/tokens.json';

const meta: Meta = { title: 'Foundations/Spacing, Radius & Shadow', tags: ['autodocs'] };
export default meta;

type Story = StoryObj;

export const Spacing: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 8 }}>
      {Object.entries(tokens.space).map(([name, value]) => (
        <div key={name} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <code style={{ width: 90 }}>space-{name}</code>
          <code style={{ width: 50 }} className="olx-text-muted">{value}</code>
          <div style={{ height: 16, width: value, background: 'var(--olx-accent)' }} />
        </div>
      ))}
    </div>
  ),
};

export const Radii: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {Object.entries(tokens.radius).map(([name, value]) => (
        <div key={name} style={{ textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, background: 'var(--olx-bg-subtle)', border: '2px solid var(--olx-primary)', borderRadius: value }} />
          <code>{name}</code>
          <div className="olx-text-muted olx-text-xs">{value}</div>
        </div>
      ))}
    </div>
  ),
};

export const Shadows: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', padding: 16 }}>
      {Object.entries(tokens.shadow).map(([name, value]) => (
        <div key={name} style={{ width: 120, height: 80, borderRadius: 8, background: 'var(--olx-surface)', boxShadow: value, display: 'grid', placeItems: 'center' }}>
          <code>{name}</code>
        </div>
      ))}
    </div>
  ),
};
