export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="olx-breadcrumb" aria-label="Breadcrumb">
      <ol>
        {items.map((item, i) => (
          <li key={item.label}>
            {i === items.length - 1 ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <a href={item.href ?? '#'}>{item.label}</a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
