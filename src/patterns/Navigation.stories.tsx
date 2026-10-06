import type { Meta, StoryObj } from '@storybook/react';

/** Chrome that sits above every page: brand strip, header, search row and category nav. */
const meta: Meta = {
  title: 'Components/Navigation',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'The site chrome, measured from live olx.com.pk. These are plain `olx-*` classes from `css/components.css` — no framework needed.' } },
  },
};
export default meta;
type Story = StoryObj;

const Pin = () => (
  <svg className="olx-location__pin" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
  </svg>
);
const Chevron = () => (
  <svg className="olx-location__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const TopBar: Story = {
  name: 'Top bar',
  render: () => (
    <div className="olx-topbar">
      <div className="olx-container olx-topbar__inner">
        <a className="olx-topbar__logo" href="#top">OLX</a>
        <a className="olx-topbar__link" href="#motors">Motors <span>Cars &amp; bikes</span></a>
        <a className="olx-topbar__link" href="#property">Property <span>Homes &amp; plots</span></a>
        <div className="olx-topbar__actions">
          <a className="olx-topbar__login" href="#login">Login</a>
          <a className="olx-sell" href="#sell">+ Sell</a>
        </div>
      </div>
    </div>
  ),
};

export const SellButton: Story = {
  name: 'Sell button',
  parameters: { layout: 'padded' },
  render: () => <a className="olx-sell" href="#sell">+ Sell</a>,
};

export const LocationPicker: Story = {
  name: 'Location picker',
  parameters: { layout: 'padded' },
  render: () => (
    <div className="olx-stack">
      <button type="button" className="olx-location" aria-expanded="false">
        <Pin />
        <span className="olx-location__value">Pakistan</span>
        <Chevron />
      </button>
      <button type="button" className="olx-location" aria-expanded="true">
        <Pin />
        <span className="olx-location__value">Gulberg, Lahore, Punjab</span>
        <Chevron />
      </button>
      <button type="button" className="olx-location olx-location--block" aria-expanded="false">
        <Pin />
        <span className="olx-location__value">Full width (olx-location--block)</span>
        <Chevron />
      </button>
    </div>
  ),
};

export const SearchRow: Story = {
  name: 'Search row',
  render: () => (
    <div className="olx-container olx-searchbar">
      <button type="button" className="olx-location" aria-expanded="false">
        <Pin />
        <span className="olx-location__value">Pakistan</span>
        <Chevron />
      </button>
      <div className="olx-search">
        <input aria-label="Search OLX" placeholder="Find Cars, Mobile Phones and more..." />
        <button type="button">Search</button>
      </div>
    </div>
  ),
};

export const Header: Story = {
  render: () => (
    <header className="olx-header">
      <a className="olx-header__logo" href="#top">OLX</a>
      <div className="olx-header__search">
        <div className="olx-search">
          <input aria-label="Search OLX" placeholder="Find Cars, Mobile Phones and more..." />
          <button type="button">Search</button>
        </div>
      </div>
      <div className="olx-header__actions">
        <a className="olx-topbar__login" href="#login">Login</a>
        <a className="olx-sell" href="#sell">+ Sell</a>
      </div>
    </header>
  ),
};

export const CategoryNav: Story = {
  name: 'Category nav',
  render: () => (
    <nav className="olx-catnav">
      <div className="olx-container olx-catnav__inner">
        <button type="button" className="olx-catnav__all">☰ All categories</button>
        {['Mobiles', 'Cars', 'Motorcycles', 'Houses', 'TV - Video - Audio', 'Tablets', 'Land &amp; Plots', 'Jobs'].map((c) => (
          <a key={c} className="olx-catnav__link" href="#category">{c}</a>
        ))}
      </div>
    </nav>
  ),
};

export const FullChrome: Story = {
  name: 'All together',
  render: () => (
    <>
      <div className="olx-topbar">
        <div className="olx-container olx-topbar__inner">
          <a className="olx-topbar__logo" href="#top">OLX</a>
          <a className="olx-topbar__link" href="#motors">Motors</a>
          <a className="olx-topbar__link" href="#property">Property</a>
          <div className="olx-topbar__actions">
            <a className="olx-topbar__login" href="#login">Login</a>
            <a className="olx-sell" href="#sell">+ Sell</a>
          </div>
        </div>
      </div>
      <div className="olx-container olx-searchbar">
        <button type="button" className="olx-location" aria-expanded="false">
          <Pin />
          <span className="olx-location__value">Pakistan</span>
          <Chevron />
        </button>
        <div className="olx-search">
          <input aria-label="Search OLX" placeholder="Find Cars, Mobile Phones and more..." />
          <button type="button">Search</button>
        </div>
      </div>
      <nav className="olx-catnav">
        <div className="olx-container olx-catnav__inner">
          <button type="button" className="olx-catnav__all">☰ All categories</button>
          {['Mobiles', 'Cars', 'Motorcycles', 'Houses', 'Jobs'].map((c) => (
            <a key={c} className="olx-catnav__link" href="#category">{c}</a>
          ))}
        </div>
      </nav>
    </>
  ),
};
