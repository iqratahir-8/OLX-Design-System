import { Badge } from '../Badge/Badge';

export interface ListingCardProps {
  price: string;
  title: string;
  meta: string;
  featured?: boolean;
  row?: boolean;
}

export function ListingCard({ price, title, meta, featured, row }: ListingCardProps) {
  const cls = ['olx-card', 'olx-listing', row && 'olx-listing--row', featured && 'olx-listing--featured']
    .filter(Boolean)
    .join(' ');
  return (
    <article className={cls}>
      {featured && <Badge variant="featured" className="olx-listing__badge">Featured</Badge>}
      <div className="olx-listing__media" role="img" aria-label={title} />
      <div className="olx-listing__body">
        <div className="olx-listing__head">
          <span className="olx-price olx-price--md">{price}</span>
        </div>
        <span className="olx-listing__title">{title}</span>
        <span className="olx-listing__meta">
          <span>{meta}</span>
        </span>
      </div>
    </article>
  );
}
