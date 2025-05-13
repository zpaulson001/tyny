import { Languages } from 'lucide-react';
import { SelectItem, SelectTrigger, SelectValue } from './ui/select';

import { SelectContent } from './ui/select';

import { Select } from './ui/select';

export function LanguageSelect({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger icon={<Languages />}>
        <SelectValue placeholder="Select languages" />
      </SelectTrigger>
      <SelectContent>
        {options.map((language) => (
          <SelectItem key={language.value} value={language.value}>
            {language.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
