import { useState, useEffect } from 'react';

/**
 * A generic debounce hook that delays updating a value until after a specified time.
 *
 * @param value The value to debounce.
 * @param delay The number of milliseconds to delay.
 * @returns The debounced value.
 */
function useDebounce<T>(value: T, delay: number = 500): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		// Update debounced value after delay
		const timer = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		// Cancel the timer if value changes (also on delay change) or if component unmounts
		return () => {
			clearTimeout(timer);
		};
	}, [value, delay]);

	return debouncedValue;
}

export default useDebounce;
