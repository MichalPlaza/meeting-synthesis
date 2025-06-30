"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface SliderProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
    "onSeeking"
  > {
  onSeeking?: (isSeeking: boolean) => void;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, onSeeking, ...props }, ref) => {
  const thumbRef = React.useRef<HTMLSpanElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handlePointerDown = () => {
    setIsDragging(true);
    onSeeking?.(true);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    onSeeking?.(false);
    thumbRef.current?.blur();
  };

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        // --- ZMIANA: Dodajemy poziomy padding `px-2` ---
        "relative flex w-full touch-none select-none items-center h-5 px-2",
        className
      )}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        ref={thumbRef}
        className={cn(
          "block h-3.5 w-3.5 rounded-full bg-primary ring-offset-background transition-transform",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          isDragging && "scale-125"
        )}
      />
    </SliderPrimitive.Root>
  );
});
Slider.displayName = "Slider";

export { Slider };
