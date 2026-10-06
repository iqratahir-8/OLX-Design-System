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

export const templateUrl = (site: Site, device: Device, name: string) => `/templates/${site}/${device}/${name}.html`;

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

export function PageFrame({ site, name, label, path, device = 'desktop', devices = ['desktop', 'mobile'], capturedAt, origin = 'https://www.olx.com.pk' }: PageFrameProps) {
  const { width, height } = SIZES[device];
  const { hostRef, scale } = useFitScale(width);
  const exists = devices.includes(device);
  const url = templateUrl(site, device, name);

  return (
    <div className={styles.root} ref={hostRef}>
      <div className={styles.bar}>
        <strong className={styles.title}>{label ?? name}</strong>
        <span className={styles.badge} data-site={site}>{site}</span>
        {path && <code className={styles.path}>{path}</code>}
        <span className={styles.spacer} />
        {capturedAt && <span>captured {capturedAt}</span>}
        {exists && <a className={styles.link} href={url} target="_blank" rel="noreferrer">Open full page ↗</a>}
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
    </div>
  );
}
