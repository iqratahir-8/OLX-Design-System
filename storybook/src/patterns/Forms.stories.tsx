import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Components/Forms',
  tags: ['autodocs'],
  parameters: { docs: { description: { component: 'Form controls: input, select, textarea, checkbox and the search bar. All 48px tall so they line up in a row.' } } },
};
export default meta;
type Story = StoryObj;

export const Input: Story = {
  render: () => (
    <div className="olx-stack" style={{ maxWidth: 420 }}>
      <label className="olx-field">
        <span className="olx-label">Ad title</span>
        <input className="olx-input" placeholder="iPhone 11 64GB" />
        <span className="olx-hint">Mention the key details buyers search for.</span>
      </label>
      <label className="olx-field olx-field--error">
        <span className="olx-label">Price</span>
        <input className="olx-input" defaultValue="-500" />
        <span className="olx-hint">Enter a price greater than zero.</span>
      </label>
    </div>
  ),
};

export const Select: Story = {
  render: () => (
    <label className="olx-field" style={{ maxWidth: 420 }}>
      <span className="olx-label">Condition</span>
      <select className="olx-select" defaultValue="used">
        <option value="new">New</option>
        <option value="used">Used</option>
      </select>
    </label>
  ),
};

export const Textarea: Story = {
  render: () => (
    <label className="olx-field" style={{ maxWidth: 420 }}>
      <span className="olx-label">Description</span>
      <textarea className="olx-textarea" placeholder="Describe the condition, accessories and reason for selling." />
      <span className="olx-hint">Minimum 30 characters.</span>
    </label>
  ),
};

export const Checkbox: Story = {
  render: () => (
    <div className="olx-stack">
      <label className="olx-check"><input type="checkbox" defaultChecked /> With pictures only</label>
      <label className="olx-check"><input type="checkbox" /> PTA approved</label>
      <label className="olx-check"><input type="checkbox" /> Negotiable price</label>
    </div>
  ),
};

export const SearchBar: Story = {
  name: 'Search bar',
  render: () => (
    <div className="olx-search" style={{ maxWidth: 620 }}>
      <input aria-label="Search OLX" placeholder="Find Cars, Mobile Phones and more..." />
      <button type="button">Search</button>
    </div>
  ),
};

export const PostAdForm: Story = {
  name: 'Post an ad form',
  render: () => (
    <form className="olx-stack" style={{ maxWidth: 480 }} onSubmit={(e) => e.preventDefault()}>
      <h2>Include some details</h2>
      <label className="olx-field">
        <span className="olx-label">Ad title *</span>
        <input className="olx-input" placeholder="iPhone 11 64GB PTA approved" />
      </label>
      <label className="olx-field">
        <span className="olx-label">Condition *</span>
        <select className="olx-select" defaultValue="used">
          <option value="new">New</option>
          <option value="used">Used</option>
        </select>
      </label>
      <label className="olx-field">
        <span className="olx-label">Description *</span>
        <textarea className="olx-textarea" placeholder="Describe the condition and accessories." />
      </label>
      <label className="olx-field">
        <span className="olx-label">Price *</span>
        <input className="olx-input" inputMode="numeric" placeholder="129000" />
      </label>
      <label className="olx-check"><input type="checkbox" /> Negotiable</label>
      <div className="olx-alert olx-alert--info"><span><strong>Before you post</strong>Ads with clear photos sell up to three times faster.</span></div>
      <button type="submit" className="olx-btn olx-btn--primary olx-btn--block">Post now</button>
    </form>
  ),
};
