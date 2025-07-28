import { Languages } from 'lucide-react';
import { SelectItem, SelectTrigger, SelectValue } from './ui/select';

import { SelectContent } from './ui/select';

import { Select } from './ui/select';
import { AVAILABLE_LANGUAGES } from '~/lib/languages';

export function LanguageSelect({
  onChange,
  value,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger icon={<Languages />}>
        <SelectValue placeholder="Select languages" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(AVAILABLE_LANGUAGES).map(([label, value]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
