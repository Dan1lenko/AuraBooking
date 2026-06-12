import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Star, AlertCircle, X } from 'lucide-react';

interface ReviewDialogProps {
  booking: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReviewDialog({ booking, onClose, onSuccess }: ReviewDialogProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Будь ласка, оберіть оцінку в зірках.');
      return;
    }
    if (!comment.trim()) {
      setError('Будь ласка, напишіть короткий коментар про ваші враження.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/reviews', {
        bookingId: booking.id,
        rating,
        comment: comment.trim(),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося надіслати відгук.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-lg space-y-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-50 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <header className="space-y-1">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Залишити відгук</p>
          <h3 className="text-lg font-bold text-slate-900">
            Залишити відгук про сесію з {booking.specialistProfile?.user?.name}
          </h3>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Star Rating Selector */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 block">Оцінка</label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const isLit = hoveredRating !== null ? star <= hoveredRating : star <= rating;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(null)}
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110 active:scale-95 cursor-pointer focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        isLit
                          ? 'fill-amber-400 text-amber-500'
                          : 'text-slate-300 hover:text-slate-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment Textarea */}
          <div className="space-y-2">
            <label htmlFor="comment" className="text-sm font-bold text-slate-700 block">
              Поділіться своїм досвідом
            </label>
            <textarea
              id="comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Як пройшла сесія? На чому ви зосередилися?"
              className="w-full text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 bg-slate-50/50"
            />
          </div>

          <footer className="flex gap-3 pt-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="py-2.5 px-4 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center min-w-[120px]"
            >
              {submitting ? 'Надсилання...' : 'Надіслати відгук'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
