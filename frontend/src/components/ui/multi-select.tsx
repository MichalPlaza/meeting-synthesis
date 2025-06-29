import * as React from "react";
import { X, Check, ChevronDown } from "lucide-react";
import { Command as CommandPrimitive } from "cmdk";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { cva } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps
  extends React.ComponentPropsWithoutRef<typeof CommandPrimitive> {
  options: MultiSelectOption[];
  selected: string[]; // Array of selected values
  onSelectedChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onSelectedChange,
  placeholder = "Select options...",
  className,
  disabled,
  ...props
}: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleSelect = React.useCallback(
    (value: string) => {
      const newSelected = selected.includes(value)
        ? selected.filter((s) => s !== value)
        : [...selected, value];
      onSelectedChange(newSelected);
      setInputValue("");
    },
    [selected, onSelectedChange]
  );

  const handleRemove = React.useCallback(
    (value: string) => {
      const newSelected = selected.filter((s) => s !== value);
      onSelectedChange(newSelected);
    },
    [selected, onSelectedChange]
  );

  // Filter out options that are already selected
  const availableOptions = React.useMemo(() => {
    return options.filter((option) => !selected.includes(option.value));
  }, [options, selected]);

  return (
    <Command
      onKeyDown={(e) => {
        if (e.key === "Backspace" && inputValue === "") {
          // Remove last selected item on backspace
          const newSelected = [...selected];
          newSelected.pop();
          onSelectedChange(newSelected);
        }
      }}
      className={cn("overflow-visible bg-transparent", className)}
      {...props}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            className={cn(
              "flex min-h-[40px] w-full rounded-[var(--radius-field)] border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
              disabled && "cursor-not-allowed opacity-50"
            )}
            onClick={() => inputRef.current?.focus()}
          >
            <div className="flex flex-wrap gap-1.5 items-center">
              {selected.map((itemValue) => {
                const option = options.find((o) => o.value === itemValue);
                if (!option) return null;
                return (
                  <Badge key={itemValue} variant="secondary">
                    {option.label}
                    <button
                      type="button"
                      className="ml-1 -mr-0.5 h-4 w-4 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent opening popover
                        handleRemove(itemValue);
                      }}
                      disabled={disabled}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
              <CommandPrimitive.Input
                ref={inputRef}
                value={inputValue}
                onValueChange={setInputValue}
                placeholder={selected.length === 0 ? placeholder : ""}
                disabled={disabled}
                className="flex-grow bg-transparent outline-none placeholder:text-muted-foreground min-w-[50px] py-1"
              />
            </div>
            <div className="flex items-center">
              <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
          <CommandGroup>
            {availableOptions.length > 0 ? (
              availableOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label} // Value for Cmdk search
                  onSelect={() => handleSelect(option.value)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(option.value)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))
            ) : (
              <CommandItem disabled>No results found.</CommandItem>
            )}
          </CommandGroup>
        </PopoverContent>
      </Popover>
    </Command>
  );
}
