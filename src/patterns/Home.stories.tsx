import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Components/Home page',
  tags: ['autodocs'],
  parameters: { docs: { description: { component: 'Blocks that make up the classifieds home page: category tiles and section headers.' } } },
};
export default meta;
type Story = StoryObj;

const CATEGORIES = ['Mobiles', 'Vehicles', 'Property for Sale', 'Electronics & Home Appliances', 'Bikes', 'Business, Industrial & Agriculture', 'Services', 'Jobs', 'Animals', 'Furniture & Home Decor', 'Fashion & Beauty', 'Books, Sports & Hobbies'];

export const CategoryTiles: Story = {
  name: 'Category tiles',
  render: () => (
    <div className="olx-cattiles">
      {CATEGORIES.map((c) => (
        <a key={c} className="olx-cattile" href="#category">
          <span className="olx-cattile__icon" aria-hidden>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M3 15l5-4 4 3 3-2 6 4" />
            </svg>
          </span>
          <span className="olx-cattile__label">{c}</span>
        </a>
      ))}
    </div>
  ),
};

export const SectionHeader: Story = {
  name: 'Section header',
  render: () => (
    <div className="olx-section-header">
      <h2>Mobile Phones</h2>
      <a className="olx-link-more" href="#more">View more</a>
    </div>
  ),
};

export const SectionWithListings: Story = {
  name: 'Section with listings',
  render: () => (
    <div className="olx-container">
      <div className="olx-section-header">
        <h2>Mobile Phones</h2>
        <a className="olx-link-more" href="#more">View more</a>
      </div>
      <div className="olx-grid">
        {[
          { price: 'Rs 129,000', title: 'iPhone 11 64GB PTA approved', place: 'Gulberg, Lahore', when: 'Today' },
          { price: 'Rs 45,500', title: 'Samsung Galaxy A14 dual sim', place: 'Clifton, Karachi', when: 'Yesterday' },
          { price: 'Rs 310,000', title: 'iPhone 14 Pro Max 256GB', place: 'F-11, Islamabad', when: '2 days ago' },
          { price: 'Rs 22,000', title: 'Infinix Hot 30i 8/128', place: 'Saddar, Peshawar', when: '3 days ago' },
        ].map((l, i) => (
          <a key={l.title} className={`olx-card olx-listing${i === 0 ? ' olx-listing--featured' : ''}`} href="#ad">
            {i === 0 && <span className="olx-badge olx-badge--featured olx-listing__badge">FEATURED</span>}
            <div className="olx-listing__media" />
            <div className="olx-listing__body">
              <span className="olx-listing__price">{l.price}</span>
              <span className="olx-listing__title">{l.title}</span>
              <span className="olx-listing__meta"><span>{l.place}</span><span>{l.when}</span></span>
            </div>
          </a>
        ))}
      </div>
    </div>
  ),
};
