import { useState } from 'react';
import styles from './PageFrame.module.css';
import { PageFrame, type Device, type Site } from './PageFrame';

/** A journey through the captured pages: pick a step, or click through the page itself. */
export interface FlowStep {
  name: string;
  label: string;
  path?: string;
  devices?: Device[];
  capturedAt?: string;
}

export interface FlowFrameProps {
  site: Site;
  flow: string;
  steps: FlowStep[];
  device?: Device;
}

export function FlowFrame({ site, flow, steps, device = 'desktop' }: FlowFrameProps) {
  const [current, setCurrent] = useState(0);
  const step = steps[current];
  if (!step) return <p className={styles.note}>No captured pages for the “{flow}” flow yet.</p>;

  return (
    <div className={styles.root}>
      <div className={styles.steps}>
        {steps.map((s, i) => (
          <span key={s.name} style={{ display: 'contents' }}>
            {i > 0 && <span className={styles.arrow}>→</span>}
            <button
              type="button"
              className={styles.step}
              data-active={i === current}
              data-missing={!(s.devices ?? ['desktop']).includes(device) || undefined}
              onClick={() => setCurrent(i)}
            >
              <span className={styles.index}>{i + 1}</span>
              {s.label}
            </button>
          </span>
        ))}
      </div>
      <PageFrame site={site} name={step.name} label={`${flow} — ${step.label}`} path={step.path} device={device} devices={step.devices} capturedAt={step.capturedAt} />
    </div>
  );
}
