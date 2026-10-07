import { useEffect, useRef, useState } from 'react';
import styles from './PageFrame.module.css';

/**
 * Renders a built page template from `design-kit/templates/` in an iframe at its real viewport
 * width, scaled to fit the canvas. Storybook and the design kit therefore show the very same
 * file — the pages can't drift from the kit because there is only one copy.
 */
export type Device = 'desktop' | 'mobile';
export type Site = 'classifieds' | 'property' | 'motors';

export const SIZES: Record<Device, { width: number; height: number }> = {
  desktop: { width: 1440, height: 1000 },
  mobile: { width: 390, height: 844 },
};

// Relative, so it resolves wherever Storybook is hosted (a sub-path, a published copy).
export const templateUrl = (site: Site, device: Device, name: string) => `templates/${site}/${device}/${name}.html`;

export function useFitScale(width: number) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const fit = () => setScale(Math.min(1, host.clientWidth / width));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(host);
    return () => observer.disconnect();
  }, [width]);
  return { hostRef, scale };
}

export interface PageFrameProps {
  site: Site;
  name: string;
  label?: string;
  path?: string;
  device?: Device;
  devices?: Device[];
  capturedAt?: string;
  origin?: string;
}

// The page at its real width, scaled down to fit the canvas when it is narrower;
// it scrolls inside its own frame, like the real page.
function FullStage({ url, width, title }: { url: string; width: number; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: width, h: 800 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = Math.min(1, box.w / width);
  return (
    <div className={styles.fullStage} ref={ref}>
      <iframe className={styles.fullFrame} title={title} src={url}
        style={{ width, height: box.h / scale, transform: `scale(${scale})`, transformOrigin: 'top center' }} />
    </div>
  );
}

export function PageFrame({ site, name, label, path, device = 'desktop', devices = ['desktop', 'mobile'], capturedAt, origin = 'https://www.olx.com.pk' }: PageFrameProps) {
  const { width, height } = SIZES[device];
  const { hostRef, scale } = useFitScale(width);
  const exists = devices.includes(device);
  const url = templateUrl(site, device, name);
  // Full page opens over the canvas, not in a new tab: a new tab can't reach the
  // file when Storybook is hosted inside another page (a published artifact).
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!full) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [full]);

  return (
    <div className={styles.root} ref={hostRef}>
      <div className={styles.bar}>
        <strong className={styles.title}>{label ?? name}</strong>
        <span className={styles.badge} data-site={site}>{site}</span>
        {path && <code className={styles.path}>{path}</code>}
        <span className={styles.spacer} />
        {capturedAt && <span>captured {capturedAt}</span>}
        {exists && <button type="button" className={styles.linkButton} onClick={() => setFull(true)}>Full page ⤢</button>}
        {path && <a className={styles.link} href={origin + path} target="_blank" rel="noreferrer">Live page ↗</a>}
      </div>
      {!exists ? (
        <p className={styles.note}>No {device} capture for <code>{name}</code> — switch the device control.</p>
      ) : (
        <>
          <div className={styles.viewport} style={{ width: width * scale, height: height * scale }}>
            <iframe className={styles.frame} title={`${label ?? name} — ${device}`} src={url} width={width} height={height} style={{ transform: `scale(${scale})` }} />
          </div>
          <p className={styles.hint}>Links to other pages in this kit work inside the frame; everything else opens the live site. Forms are inert — nothing can be submitted.</p>
        </>
      )}
      {full && exists && (
        <div className={styles.full} role="dialog" aria-modal="true" aria-label={`${label ?? name}, full page`}>
          <div className={styles.fullBar}>
            <strong className={styles.title}>{label ?? name}</strong>
            <span className={styles.badge} data-site={site}>{site}</span>
            <span>{device} · {width}px wide</span>
            <span className={styles.spacer} />
            <button type="button" className={styles.linkButton} onClick={() => setFull(false)} autoFocus>Close (Esc)</button>
          </div>
          <FullStage url={url} width={width} title={`${label ?? name} — ${device}, full page`} />
        </div>
      )}
    </div>
  );
}
