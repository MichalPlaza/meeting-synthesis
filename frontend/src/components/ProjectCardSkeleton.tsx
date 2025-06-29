import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

function ProjectCardSkeleton() {
  return (
    <li className="list-none">
      <Card className="flex flex-col h-full bg-card rounded-[var(--radius-container)] shadow-md">
        <CardHeader className="pb-4">
          {/* Skeleton for Title */}
          <div className="h-5 w-3/4 rounded-md bg-muted animate-pulse" />
          {/* Skeleton for Description */}
          <div className="h-4 w-1/2 rounded-md bg-muted animate-pulse" />
        </CardHeader>

        <CardContent className="flex-grow py-0 space-y-2">
          {/* Skeleton for Paragraph */}
          <div className="h-4 w-full rounded-md bg-muted animate-pulse" />
          <div className="h-4 w-full rounded-md bg-muted animate-pulse" />
          <div className="h-4 w-3/4 rounded-md bg-muted animate-pulse" />
        </CardContent>

        <CardFooter className="mt-auto flex justify-between items-center pt-6 border-t">
          {/* Skeleton for Date */}
          <div className="h-4 w-1/4 rounded-md bg-muted animate-pulse" />
          {/* Skeleton for Button */}
          <div className="h-8 w-24 rounded-[var(--radius-pill)] bg-muted animate-pulse" />
        </CardFooter>
      </Card>
    </li>
  );
}

export default ProjectCardSkeleton;
