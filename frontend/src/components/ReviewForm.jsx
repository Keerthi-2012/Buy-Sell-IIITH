import { useState } from 'react';
import toast from 'react-hot-toast';
import { api, errorMessage } from '../utils/api';
import './ReviewForm.css';

// Lets a buyer rate a seller after a completed order. A buyer has one rating per seller, so
// passing `initial` (their current rating) turns this into an update.
const ReviewForm = ({ transactionId, initial, onDone }) => {
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [comment, setComment] = useState(initial?.comment ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/order/${transactionId}/review`, {
        rating: Number(rating),
        comment: comment.trim() || undefined,
      });
      toast.success(initial ? 'Your rating was updated' : 'Thanks for rating the seller!');
      onDone();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save your review'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="review-form">
      <label>
        {initial ? 'Your rating:' : 'Rate the seller:'}{' '}
        <select value={rating} onChange={(e) => setRating(e.target.value)}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {'★'.repeat(n)} ({n})
            </option>
          ))}
        </select>
      </label>
      <input
        type="text"
        placeholder="Add a comment (optional)"
        maxLength={500}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button type="submit" disabled={busy}>
        {busy ? 'Saving...' : initial ? 'Update review' : 'Submit review'}
      </button>
    </form>
  );
};

export default ReviewForm;
