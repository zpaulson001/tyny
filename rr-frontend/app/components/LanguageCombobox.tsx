import * as React from 'react';
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';

import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import { type AvailableLanguages } from '~/lib/api-client';

export type LanguageComboboxProps = {
  options: AvailableLanguages;
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
};

export function LanguageCombobox({
  options,
  values,
  onChange,
  disabled,
}: LanguageComboboxProps) {
  const [open, setOpen] = React.useState(false);

  // Convert options object to array format for easier mapping
  const languageOptions = options.map((language) => ({
    value: language.code,
    label: language.name,
  }));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between overflow-ellipsis"
          disabled={disabled}
        >
          {values.length > 0
            ? values
                .map(
                  (value) =>
                    languageOptions.find((language) => language.value === value)
                      ?.label
                )
                .join(', ')
            : 'Select language...'}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search languages..." />
          <CommandList>
            <CommandEmpty>No language found.</CommandEmpty>
            <CommandGroup>
              {languageOptions.map((language) => (
                <CommandItem
                  key={language.value}
                  value={language.label}
                  onSelect={(currentLabel) => {
                    const currentValue = languageOptions.find(
                      (language) => language.label === currentLabel
                    )?.value;

                    if (!currentValue) {
                      return;
                    }
                    onChange(
                      values.includes(currentValue)
                        ? values.filter((v) => v !== currentValue)
                        : [...values, currentValue]
                    );
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      'mr-2 h-4 w-4',
                      values.includes(language.value)
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  {language.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
