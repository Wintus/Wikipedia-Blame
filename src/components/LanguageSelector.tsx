import { ChangeEvent } from 'react';
import { WikiLanguage } from '../types';

type LanguageSelectorProps = {
	language: WikiLanguage;
	onChange: (lang: WikiLanguage) => void;
};

export function LanguageSelector({
	language,
	onChange,
}: LanguageSelectorProps) {
	const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
		onChange(e.target.value as WikiLanguage);
	};

	return (
		<div className="language-selector">
			<label htmlFor="language-select">Wikipedia Language:</label>
			<select id="language-select" value={language} onChange={handleChange}>
				<option value="en">English (en.wikipedia.org)</option>
				<option value="ja">Japanese (ja.wikipedia.org)</option>
			</select>
		</div>
	);
}
