import type { AvailableLanguages } from '~/lib/api-client';
import { LanguageCombobox } from './LanguageCombobox';
import PlayStopButton from './PlayStopButton';
import { useToolbar, useToolbarActions } from '~/stores/toolbar';

interface ToolbarProps {
  subscriptionState: string;
  onToggle: () => void;
  languageOptions: AvailableLanguages;
}

export default function SubscriberToolbar({
  languageOptions,
  subscriptionState,
  onToggle,
}: ToolbarProps) {
  const { selectedLanguages } = useToolbar();
  const { setSelectedLanguages } = useToolbarActions();

  return (
    <div className="flex items-center justify-center border border-border px-4 py-4 gap-4 rounded-lg bg-background shadow-lg">
      <LanguageCombobox
        options={languageOptions}
        values={selectedLanguages}
        onChange={(languages) => setSelectedLanguages(languages)}
        disabled={subscriptionState !== 'disconnected'}
      />
      <PlayStopButton
        streamState={subscriptionState}
        onClick={onToggle}
        mode="file"
      />
    </div>
  );
}
