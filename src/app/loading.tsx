export default function Loading() {
  return (
    <div className="container loading-state" role="status">
      <span className="ui-spinner page-spinner" aria-hidden="true" />
      <span className="eyebrow">FINDING YOUR SPACE</span>
      <p>Loading Cabahay…</p>
      <div className="skeleton-grid" aria-hidden="true">
        {[1, 2, 3].map((item) => (
          <div key={item} className="skeleton-card" />
        ))}
      </div>
    </div>
  );
}
