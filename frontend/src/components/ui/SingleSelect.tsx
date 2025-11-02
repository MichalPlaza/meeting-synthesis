import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandInput } from "@/components/ui/command";

interface SingleSelectOption {
  value: string;
  label: string;
}

interface SingleSelectProps {
  options: SingleSelectOption[];
  value: string | null;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SingleSelect({
                               options,
                               value,
                               onValueChange,
                               placeholder = "Select...",
                               disabled,
                               className,
                             }: SingleSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selectedOption = options.find((o) => o.value === value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "flex items-center justify-between rounded-[var(--radius-field)] border border-input bg-background px-3 py-2 text-sm cursor-pointer",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
          onClick={() => {
            if (!disabled) {
              setOpen(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }
          }}
        >
          <span className={cn(!selectedOption && "text-muted-foreground")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </PopoverTrigger>

      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" forceMount>
        <Command loop onValueChange={(val) => {
          onValueChange(val);
          setOpen(false);
        }}>
          <CommandInput ref={inputRef} placeholder="Search..." className="px-2 py-1 outline-none" />
          <CommandGroup>
            {options.length > 0 ? (
              options.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center justify-between cursor-pointer px-2 py-1 hover:bg-muted",
                    value === option.value && "font-semibold"
                  )}
                  onClick={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                  {value === option.value && <Check className="h-4 w-4 text-foreground" />}
                </div>
              ))
            ) : (
              <div className="px-2 py-1 text-muted">No managers found</div>
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
