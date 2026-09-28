export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="btn-secondary !py-1 !px-3 text-sm disabled:opacity-40"
      >
        ← Sebelumnya
      </button>
      <span className="text-sm text-muted">
        Halaman {page} dari {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="btn-secondary !py-1 !px-3 text-sm disabled:opacity-40"
      >
        Berikutnya →
      </button>
    </div>
  );
}
