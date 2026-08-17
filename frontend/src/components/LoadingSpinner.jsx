export default function LoadingSpinner({ label = "جارٍ التحميل..." }) {
  return (
    <div className="loading-spinner" role="status" aria-live="polite">
      <svg viewBox="25 25 50 50" aria-hidden="true"><circle r="20" cy="50" cx="50" /></svg>
      <span>{label}</span>
    </div>
  );
}
