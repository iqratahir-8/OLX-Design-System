import type { Meta, StoryObj } from '@storybook/react';
import manifest from '../design-kit/templates/templates.json';

/** Front door: what is in this design system and where each part comes from. */
const meta: Meta = {
  title: 'Overview',
  parameters: { layout: 'fullscreen', options: { showPanel: false } },
};
export default meta;
type Story = StoryObj;

type SiteKey = keyof typeof manifest.sites;
const sites = manifest.sites as Record<string, { label: string; source: string; flows: { name: string; steps: string[] }[]; pages: Record<string, { label: string; devices: string[]; path?: string }> }>;

const card: React.CSSProperties = { border: '1px solid var(--olx-border)', borderRadius: 12, padding: 20, background: 'var(--olx-surface)' };

export const WhatsInside: Story = {
  name: 'What’s inside',
  render: () => {
    const totalPages = Object.values(sites).reduce((a, s) => a + Object.keys(s.pages).length, 0);
    const totalFlows = Object.values(sites).reduce((a, s) => a + s.flows.length, 0);
    return (
      <div className="olx-container" style={{ paddingTop: 32, paddingBottom: 48, maxWidth: 1000 }}>
        <h1 style={{ marginTop: 0 }}>OLX Design System</h1>
        <p style={{ fontSize: 16, maxWidth: 70 + 'ch', color: 'var(--olx-text-muted)' }}>
          One place for the OLX foundations, components and real page flows — across all three
          products. <strong>Foundations</strong> and <strong>Components</strong> are the design
          system itself. <strong>Pages</strong> and <strong>Flows</strong> are frozen captures of
          the live site, so what you see is what ships.
        </p>

        <div className="olx-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', margin: '32px 0' }}>
          {Object.entries(sites).map(([key, site]) => (
            <div key={key} style={card}>
              <div className="olx-cluster" style={{ gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>{site.label}</h2>
              </div>
              <p style={{ color: 'var(--olx-text-muted)', fontSize: 13, margin: '8px 0 16px' }}>{site.source}</p>
              <p style={{ margin: 0 }}>
                <strong>{Object.keys(site.pages).length}</strong> pages · <strong>{site.flows.length}</strong> flows
              </p>
              <ul style={{ margin: '12px 0 0', paddingLeft: 18, color: 'var(--olx-text-muted)', fontSize: 13 }}>
                {site.flows.map((f) => <li key={f.name}>{f.name}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <h2>How it fits together</h2>
        <dl className="olx-details" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <div className="olx-details__row"><dt>Foundations</dt><dd>Colour, type and spacing, generated from <code>tokens/tokens.json</code></dd></div>
          <div className="olx-details__row"><dt>Components</dt><dd>The <code>olx-*</code> classes in <code>css/components.css</code> — framework-agnostic</dd></div>
          <div className="olx-details__row"><dt>Pages</dt><dd>{totalPages} captured pages in <code>design-kit/templates/</code>, rendered as-is</dd></div>
          <div className="olx-details__row"><dt>Flows</dt><dd>{totalFlows} journeys that step through those pages in order</dd></div>
        </dl>

        <h2>Using the captured pages</h2>
        <ul style={{ lineHeight: 1.8 }}>
          <li>Switch <strong>device</strong> on any page story: desktop renders at 1440px, mobile at 390px.</li>
          <li>Links between captured pages work <em>inside</em> the frame — click through a journey as a user would. Everything else opens the live site in a new tab.</li>
          <li>Forms are deliberately inert. Nothing on these pages can be submitted, so no lead, finance or insurance enquiry can ever be sent from the kit.</li>
          <li>Scripts are stripped, so anything that only exists after JavaScript runs (dropdowns, modals, filter panels) is not in the capture.</li>
        </ul>

        <h2>Rebuilding</h2>
        <dl className="olx-details" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <div className="olx-details__row"><dt>npm run dev</dt><dd>Storybook on port 6006</dd></div>
          <div className="olx-details__row"><dt>npm run capture:sites</dt><dd>Re-capture classifieds and property from the live site</dd></div>
          <div className="olx-details__row"><dt>npm run capture:motors</dt><dd>Re-fetch the Motors pages</dd></div>
          <div className="olx-details__row"><dt>npm run build:kit</dt><dd>Rebuild templates, localise fonts and icons, regenerate stories</dd></div>
        </dl>
      </div>
    );
  },
};

export const PageIndex: Story = {
  name: 'Page index',
  render: () => (
    <div className="olx-container" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <h1 style={{ marginTop: 0 }}>Every captured page</h1>
      {Object.entries(sites).map(([key, site]) => (
        <section key={key} style={{ marginBottom: 32 }}>
          <div className="olx-section-header"><h2>{site.label}</h2></div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--olx-border)' }}>
                <th style={{ padding: '8px 12px' }}>Page</th>
                <th style={{ padding: '8px 12px' }}>Path</th>
                <th style={{ padding: '8px 12px' }}>Devices</th>
                <th style={{ padding: '8px 12px' }}>Open</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(site.pages).map(([name, p]) => (
                <tr key={name} style={{ borderBottom: '1px solid var(--olx-border-subtle)' }}>
                  <td style={{ padding: '8px 12px' }}>{p.label}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--olx-text-muted)', fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{p.path}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--olx-text-muted)' }}>{p.devices.join(', ')}</td>
                  <td style={{ padding: '8px 12px' }}>
                    {p.devices.map((d) => (
                      <a key={d} className="olx-link-more" style={{ marginRight: 12, fontSize: 13 }} href={`templates/${key}/${d}/${name}.html`} target="_blank" rel="noreferrer">{d} ↗</a>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  ),
};
