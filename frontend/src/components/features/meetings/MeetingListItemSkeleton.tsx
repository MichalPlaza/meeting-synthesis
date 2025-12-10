export function MeetingListItemSkeleton() {
  return (
    <li className="list-none">
      <div className="flex items-start gap-4 p-4">
        <div className="h-5 w-5 rounded bg-muted animate-pulse mt-1" />
        <div className="flex-grow space-y-2">
          <div className="h-5 w-3/4 rounded-md bg-muted animate-pulse" />
          <div className="h-4 w-1/2 rounded-md bg-muted animate-pulse" />
        </div>
      </div>
    </li>
  );
}
