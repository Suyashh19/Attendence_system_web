/** A grey block that pulses while content loads. */
function Block({ className = '' }: { className?: string }) {
  return <div className={`bg-light-border/70 animate-pulse ${className}`} />;
}

/** A card-shaped placeholder: an icon square, two lines of text and a trailing pill. */
function CardSkeleton() {
  return (
    <div className="bg-light-card rounded-3xl p-4 border border-light-border shadow-card mb-3 flex items-center">
      <Block className="w-[52px] h-[52px] rounded-2xl mr-3 shrink-0" />
      <div className="flex-1 min-w-0 mr-3">
        <Block className="h-4 rounded-md w-3/5 mb-2.5" />
        <Block className="h-3 rounded-md w-2/5" />
      </div>
      <Block className="h-8 w-16 rounded-full shrink-0" />
    </div>
  );
}

/** Placeholder rows for a list that is still loading. */
export function ListSkeleton({ count = 4, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={className} aria-busy aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Placeholder for a whole tab: the header block and a few rows. */
export function TabSkeleton() {
  return (
    <div aria-busy aria-label="Loading">
      <div className="hero rounded-b-[32px] px-5 pb-6" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div className="flex items-center">
          <Block className="w-12 h-12 rounded-full bg-white/15" />
          <Block className="h-6 w-40 rounded-md mx-3 flex-1 max-w-[10rem] bg-white/15" />
        </div>
        <div className="flex gap-2 mt-5">
          {[0, 1, 2].map((i) => (
            <Block key={i} className="flex-1 h-[66px] rounded-2xl bg-white/10" />
          ))}
        </div>
      </div>
      <div className="px-4 pt-6">
        <ListSkeleton count={3} />
      </div>
    </div>
  );
}
