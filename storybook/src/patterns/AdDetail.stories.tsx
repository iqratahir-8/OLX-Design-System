import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Components/Ad detail',
  tags: ['autodocs'],
  parameters: { docs: { description: { component: 'The ad detail page: image gallery, price and summary, the details table, and the seller card with its contact actions.' } } },
};
export default meta;
type Story = StoryObj;

const PinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
  </svg>
);

const Photo = () => (
  <svg width="820" height="480" viewBox="0 0 820 480" role="img" aria-label="Ad photo placeholder">
    <rect width="820" height="480" fill="#f2f4f5" />
    <path d="M300 300l80-70 60 45 50-35 90 60z" fill="#cdd6d7" />
    <circle cx="330" cy="190" r="26" fill="#cdd6d7" />
  </svg>
);

export const Gallery: Story = {
  render: () => (
    <div>
      <div className="olx-gallery">
        <div className="olx-gallery__stage"><Photo /></div>
        <button type="button" className="olx-gallery__nav olx-gallery__nav--prev" aria-label="Previous photo">&lsaquo;</button>
        <button type="button" className="olx-gallery__nav olx-gallery__nav--next" aria-label="Next photo">&rsaquo;</button>
        <span className="olx-gallery__count">1 / 6</span>
      </div>
      <ul className="olx-gallery__thumbs">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i}>
            <button type="button" className="olx-gallery__thumb" aria-current={i === 0 ? 'true' : undefined} aria-label={`Photo ${i + 1}`} />
          </li>
        ))}
      </ul>
    </div>
  ),
};

export const Price: Story = {
  render: () => (
    <div className="olx-stack">
      <span className="olx-price olx-price--lg">Rs 129,000</span>
      <span className="olx-price olx-price--md">Rs 129,000</span>
      <span className="olx-price">Rs 129,000</span>
    </div>
  ),
};

export const AdSummary: Story = {
  name: 'Ad summary',
  render: () => (
    <div className="olx-ad-summary">
      <span className="olx-price olx-price--lg">Rs 129,000</span>
      <div className="olx-ad-summary__actions">
        <button type="button" aria-label="Add to favourites">&#9825;</button>
        <button type="button" aria-label="Share this ad">&#8599;</button>
      </div>
      <h1 className="olx-ad-summary__title">iPhone 11 64GB PTA approved, box and charger included</h1>
      <div className="olx-ad-summary__meta">
        <span className="olx-ad-summary__location"><PinIcon /> Gulberg 3, Lahore, Punjab</span>
        <span>Today</span>
      </div>
    </div>
  ),
};

export const DetailsTable: Story = {
  name: 'Details table',
  render: () => (
    <dl className="olx-details">
      {[
        ['Brand', 'Apple'],
        ['Model', 'iPhone 11'],
        ['Condition', 'Used'],
        ['Storage', '64 GB'],
        ['PTA approved', 'Yes'],
        ['Accessories', 'Box, charger'],
      ].map(([k, v]) => (
        <div className="olx-details__row" key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  ),
};

export const SellerCard: Story = {
  name: 'Seller card',
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <div className="olx-seller">
        <a className="olx-seller__profile" href="#profile">
          <span className="olx-seller__avatar" />
          <span className="olx-seller__who">
            <span className="olx-seller__label">Posted by</span>
            <span className="olx-seller__name">Ahmed R.</span>
          </span>
          <span aria-hidden>&rsaquo;</span>
        </a>
        <dl className="olx-seller__stats">
          <div className="olx-seller__stat">
            <span className="olx-seller__stat-icon" aria-hidden>&#9733;</span>
            <div><dt>Member since</dt><dd>2019</dd></div>
          </div>
          <div className="olx-seller__stat">
            <span className="olx-seller__stat-icon" aria-hidden>&#9776;</span>
            <div><dt>Live ads</dt><dd>12</dd></div>
          </div>
        </dl>
      </div>
      <div className="olx-contact">
        <button type="button" className="olx-btn olx-btn--secondary olx-btn--block">Show phone number</button>
        <button type="button" className="olx-btn olx-btn--primary olx-btn--block">Chat with seller</button>
        <div className="olx-contact__foot">
          <span>Ad id 1119673157</span>
          <button type="button" className="olx-contact__report">&#9873; Report this ad</button>
        </div>
      </div>
    </div>
  ),
};

export const AdDetailLayout: Story = {
  name: 'Ad detail layout',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="olx-container" style={{ paddingTop: 24 }}>
      <nav className="olx-breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li><a href="#home">Home</a></li>
          <li><a href="#mobiles">Mobiles</a></li>
          <li aria-current="page">iPhone 11 64GB</li>
        </ol>
      </nav>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 360px)', gap: 24, alignItems: 'start', marginTop: 16 }}>
        <div>
          <div className="olx-gallery">
            <div className="olx-gallery__stage"><Photo /></div>
            <span className="olx-gallery__count">1 / 6</span>
          </div>
          <div className="olx-ad-summary">
            <span className="olx-price olx-price--lg">Rs 129,000</span>
            <div className="olx-ad-summary__actions">
              <button type="button" aria-label="Add to favourites">&#9825;</button>
              <button type="button" aria-label="Share this ad">&#8599;</button>
            </div>
            <h1 className="olx-ad-summary__title">iPhone 11 64GB PTA approved</h1>
            <div className="olx-ad-summary__meta">
              <span className="olx-ad-summary__location"><PinIcon /> Gulberg 3, Lahore</span>
              <span>Today</span>
            </div>
          </div>
          <hr className="olx-divider" />
          <h2>Details</h2>
          <dl className="olx-details">
            {[['Brand', 'Apple'], ['Condition', 'Used'], ['Storage', '64 GB'], ['PTA approved', 'Yes']].map(([k, v]) => (
              <div className="olx-details__row" key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        </div>
        <div>
          <div className="olx-seller">
            <a className="olx-seller__profile" href="#profile">
              <span className="olx-seller__avatar" />
              <span className="olx-seller__who">
                <span className="olx-seller__label">Posted by</span>
                <span className="olx-seller__name">Ahmed R.</span>
              </span>
            </a>
          </div>
          <div className="olx-contact">
            <button type="button" className="olx-btn olx-btn--secondary olx-btn--block">Show phone number</button>
            <button type="button" className="olx-btn olx-btn--primary olx-btn--block">Chat with seller</button>
          </div>
        </div>
      </div>
    </div>
  ),
};
