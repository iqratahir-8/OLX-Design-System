import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Components/Listing page',
  tags: ['autodocs'],
  parameters: { docs: { description: { component: 'Category and search result pages: page title with result count, the filter sidebar, and the row (list view) listing card.' } } },
};
export default meta;
type Story = StoryObj;

export const PageTitle: Story = {
  name: 'Page title with count',
  render: () => (
    <div className="olx-page-title">
      <h1>Mobile Phones for sale in Pakistan</h1>
      <span className="olx-badge olx-badge--accent">61,284 Results</span>
    </div>
  ),
};

export const FilterPanel: Story = {
  name: 'Filter panel',
  render: () => (
    <div style={{ maxWidth: 320 }}>
      <section className="olx-filter">
        <h3 className="olx-filter__title">Categories</h3>
        <ul className="olx-filter__list">
          <li><a className="olx-filter__item" href="#all">All Categories</a></li>
          <li>
            <a className="olx-filter__item" aria-current="true" href="#mobiles">Mobiles <span className="olx-filter__count">61,284</span></a>
            <ul className="olx-filter__list">
              <li><a className="olx-filter__item" href="#phones">Mobile Phones <span className="olx-filter__count">54,112</span></a></li>
              <li><a className="olx-filter__item" href="#acc">Accessories <span className="olx-filter__count">5,003</span></a></li>
              <li><a className="olx-filter__item" href="#tablets">Tablets <span className="olx-filter__count">2,169</span></a></li>
            </ul>
          </li>
        </ul>
      </section>
      <section className="olx-filter">
        <h3 className="olx-filter__title">Price</h3>
        <div className="olx-filter__range">
          <input className="olx-input" aria-label="Minimum price" placeholder="Min" inputMode="numeric" />
          <span>to</span>
          <input className="olx-input" aria-label="Maximum price" placeholder="Max" inputMode="numeric" />
        </div>
      </section>
      <section className="olx-filter">
        <h3 className="olx-filter__title">Brand</h3>
        <ul className="olx-filter__list">
          {['Apple', 'Samsung', 'Infinix', 'Xiaomi', 'Oppo'].map((b) => (
            <li key={b}>
              <label className="olx-check"><input type="checkbox" /> {b}</label>
            </li>
          ))}
        </ul>
        <button type="button" className="olx-filter__more">Show more ⌄</button>
      </section>
    </div>
  ),
};

export const ListingRow: Story = {
  name: 'Listing card — row',
  render: () => (
    <div className="olx-stack">
      <a className="olx-card olx-listing olx-listing--row olx-listing--featured" href="#ad">
        <span className="olx-listing__ribbon">★ AD OF THE WEEK</span>
        <div className="olx-listing__media" />
        <div className="olx-listing__body">
          <div className="olx-listing__head">
            <span className="olx-price olx-price--md">Rs 129,000</span>
            <button type="button" className="olx-listing__fav" aria-pressed="false" aria-label="Add to favourites">♡</button>
          </div>
          <span className="olx-listing__title">iPhone 11 64GB PTA approved, box and charger included</span>
          <p className="olx-listing__desc">Single hand used, no scratches, battery health 89%. Serious buyers only. Exchange possible with iPhone 12.</p>
          <span className="olx-listing__meta"><span>Gulberg, Lahore</span><span>Today</span></span>
        </div>
      </a>
      <a className="olx-card olx-listing olx-listing--row" href="#ad">
        <div className="olx-listing__media" />
        <div className="olx-listing__body">
          <div className="olx-listing__head">
            <span className="olx-price olx-price--md">Rs 45,500</span>
            <button type="button" className="olx-listing__fav" aria-pressed="true" aria-label="Remove from favourites">♥</button>
          </div>
          <span className="olx-listing__title">Samsung Galaxy A14 dual sim, 4/128</span>
          <p className="olx-listing__desc">Complete box with warranty card. Ten months used.</p>
          <span className="olx-listing__meta"><span>Clifton, Karachi</span><span>Yesterday</span></span>
        </div>
      </a>
    </div>
  ),
};

export const ListingPage: Story = {
  name: 'Listing page layout',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="olx-container" style={{ paddingTop: 24 }}>
      <nav className="olx-breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li><a href="#home">Home</a></li>
          <li><a href="#mobiles">Mobiles</a></li>
          <li aria-current="page">Mobile Phones</li>
        </ol>
      </nav>
      <div className="olx-page-title">
        <h1>Mobile Phones for sale in Pakistan</h1>
        <span className="olx-badge olx-badge--accent">61,284 Results</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 320px) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
        <section className="olx-filter">
          <h3 className="olx-filter__title">Price</h3>
          <div className="olx-filter__range">
            <input className="olx-input" aria-label="Minimum price" placeholder="Min" />
            <span>to</span>
            <input className="olx-input" aria-label="Maximum price" placeholder="Max" />
          </div>
        </section>
        <div className="olx-stack">
          <div className="olx-cluster">
            {['Apple', 'Samsung', 'Under Rs 50,000', 'With pictures'].map((c, i) => (
              <button key={c} type="button" className="olx-chip" aria-pressed={i === 0}>{c}</button>
            ))}
          </div>
          <a className="olx-card olx-listing olx-listing--row" href="#ad">
            <div className="olx-listing__media" />
            <div className="olx-listing__body">
              <div className="olx-listing__head">
                <span className="olx-price olx-price--md">Rs 129,000</span>
                <button type="button" className="olx-listing__fav" aria-pressed="false" aria-label="Add to favourites">♡</button>
              </div>
              <span className="olx-listing__title">iPhone 11 64GB PTA approved</span>
              <p className="olx-listing__desc">Single hand used, battery health 89%.</p>
              <span className="olx-listing__meta"><span>Gulberg, Lahore</span><span>Today</span></span>
            </div>
          </a>
        </div>
      </div>
    </div>
  ),
};
