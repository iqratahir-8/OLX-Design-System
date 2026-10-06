import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Components/Layout',
  tags: ['autodocs'],
  parameters: { docs: { description: { component: 'Layout primitives every page is built from: the page container, the listing grid, vertical stack, horizontal cluster, divider and card.' } } },
};
export default meta;
type Story = StoryObj;

const box = (label: string) => (
  <div key={label} style={{ background: 'var(--olx-bg-subtle)', border: '1px dashed var(--olx-border)', borderRadius: 8, padding: 16, fontSize: 13 }}>{label}</div>
);

export const Container: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div style={{ background: 'var(--olx-brand-bg)', padding: '24px 0' }}>
      <div className="olx-container">{box('olx-container — max 1280px, centred, 16px side padding')}</div>
    </div>
  ),
};

export const Grid: Story = {
  render: () => <div className="olx-grid">{['215px min', 'auto-fill', 'cards', 'wrap', 'as needed', 'six'].map(box)}</div>,
};

export const Stack: Story = {
  render: () => <div className="olx-stack">{['First', 'Second', 'Third'].map(box)}</div>,
};

export const Cluster: Story = {
  render: () => (
    <div className="olx-cluster">
      <button type="button" className="olx-chip" aria-pressed="true">Apple</button>
      <button type="button" className="olx-chip">Samsung</button>
      <button type="button" className="olx-chip">Under Rs 50,000</button>
      <a className="olx-link-more" href="#more">Clear all</a>
    </div>
  ),
};

export const Divider: Story = {
  render: () => (
    <div>
      <p>Section above</p>
      <hr className="olx-divider" />
      <p>Section below</p>
    </div>
  ),
};

export const Card: Story = {
  render: () => (
    <div className="olx-grid">
      <div className="olx-card" style={{ padding: 16 }}>olx-card — 1px border</div>
      <div className="olx-card olx-card--elevated" style={{ padding: 16 }}>olx-card--elevated — shadow, no border</div>
    </div>
  ),
};
