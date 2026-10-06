import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Components/Footer',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: 'The app download banner and the site footer, including the inverted legal bar.' } } },
};
export default meta;
type Story = StoryObj;

const COLUMNS: Record<string, string[]> = {
  'Popular categories': ['Cars', 'Flats for rent', 'Mobile phones', 'Jobs'],
  'Trending searches': ['Bikes', 'Watches', 'Books', 'Dogs'],
  'About us': ['About OLX Group', 'OLX Blog', 'Careers', 'Contact us'],
  OLX: ['Help', 'Sitemap', 'Terms of use', 'Privacy policy'],
};

const Columns = () => (
  <>
    {Object.entries(COLUMNS).map(([heading, links]) => (
      <div key={heading}>
        <h3 className="olx-footer__heading">{heading}</h3>
        <ul className="olx-footer__links">
          {links.map((l) => <li key={l}><a href="#link">{l}</a></li>)}
        </ul>
      </div>
    ))}
  </>
);

const Banner = () => (
  <div className="olx-appbanner">
    <div className="olx-container olx-appbanner__inner">
      <h2 className="olx-appbanner__title"><a href="#apps">Try the OLX app</a></h2>
      <div className="olx-appbanner__stores">
        <a className="olx-btn olx-btn--secondary olx-btn--sm" href="#appstore">App Store</a>
        <a className="olx-btn olx-btn--secondary olx-btn--sm" href="#play">Google Play</a>
      </div>
    </div>
  </div>
);

export const AppBanner: Story = { name: 'App banner', render: () => <Banner /> };

export const Footer: Story = {
  render: () => (
    <footer className="olx-footer">
      <div className="olx-container olx-footer__cols">
        <Columns />
        <div>
          <h3 className="olx-footer__heading">Follow us</h3>
          <div className="olx-footer__social">
            {['f', 'in', 'ig'].map((s) => <a key={s} href="#social" aria-label={`OLX on ${s}`}>{s}</a>)}
          </div>
        </div>
      </div>
      <div className="olx-footer__bar">
        <div className="olx-container olx-footer__bar-inner">
          <span>Free Classifieds in Pakistan &middot; &copy; 2026 <strong>OLX</strong></span>
        </div>
      </div>
    </footer>
  ),
};

export const BannerAndFooter: Story = {
  name: 'Banner and footer',
  render: () => (
    <>
      <Banner />
      <footer className="olx-footer">
        <div className="olx-container olx-footer__cols">
          <Columns />
        </div>
        <div className="olx-footer__bar">
          <div className="olx-container olx-footer__bar-inner">
            <span>Free Classifieds in Pakistan &middot; &copy; 2026 <strong>OLX</strong></span>
          </div>
        </div>
      </footer>
    </>
  ),
};
