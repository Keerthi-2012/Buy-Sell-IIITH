// 4 -> "★★★★☆"
export const Stars = ({ value }) => {
  const filled = Math.max(0, Math.min(5, Math.round(value || 0)));
  return <span aria-label={`${filled} out of 5 stars`}>{'★'.repeat(filled)}{'☆'.repeat(5 - filled)}</span>;
};

// "★★★★☆ 4.5 (12 reviews)", or a plain note when nobody has reviewed yet.
export const SellerRating = ({ summary }) => {
  if (!summary?.count) return <span>No reviews yet</span>;
  return (
    <span>
      <Stars value={summary.average} /> {summary.average} ({summary.count} review{summary.count === 1 ? '' : 's'})
    </span>
  );
};
