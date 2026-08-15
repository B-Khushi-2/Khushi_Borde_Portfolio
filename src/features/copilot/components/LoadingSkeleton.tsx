export function MessageSkeleton() {
  return (
    <div className="flex items-start gap-2.5 px-1 py-2">
      <div className="copilot-skeleton h-7 w-7 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="copilot-skeleton h-3 w-4/5 rounded" />
        <div className="copilot-skeleton h-3 w-3/5 rounded" />
      </div>
    </div>
  );
}

export function PanelLoadingSkeleton() {
  return (
    <div className="space-y-1">
      <MessageSkeleton />
      <MessageSkeleton />
    </div>
  );
}
