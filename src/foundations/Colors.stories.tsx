import type { Meta, StoryObj } from '@storybook/react';
import tokens from '../../tokens/tokens.json';

const meta: Meta = { title: 'Foundations/Colors', tags: ['autodocs'] };
export default meta;

type Story = StoryObj;

const swatch = (name: string, value: string) => (
  <div key={name} style={{ width: 120 }}>
    <div style={{ height: 56, borderRadius: 8, background: value, border: '1px solid var(--olx-border)' }} />
    <div style={{ fontSize: 12, marginTop: 4 }}>{name}</div>
    <div className="olx-text-muted olx-text-xs">{value}</div>
  </div>
);

export const Palette: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24 }}>
      {Object.entries(tokens.color).map(([family, shades]) => (
        <section key={family}>
          <h4>{family}</h4>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {typeof shades === 'string'
              ? swatch(family, shades)
              : Object.entries(shades).map(([step, hex]) => swatch(`${family}-${step}`, hex as string))}
          </div>
        </section>
      ))}
    </div>
  ),
};

const semanticNames = ['bg', 'bg-subtle', 'surface', 'text', 'text-muted', 'border', 'primary', 'accent', 'highlight', 'link', 'info-bg', 'success-bg', 'warning-bg', 'danger-bg'];

/** Semantic tokens follow the Theme toolbar (light/dark). */
export const Semantic: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {semanticNames.map((n) => swatch(`--olx-${n}`, `var(--olx-${n})`))}
    </div>
  ),
};
