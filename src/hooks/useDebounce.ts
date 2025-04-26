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

if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;
	const { renderHook, act, waitFor } = await import('@testing-library/react');

	describe('useDebounce', () => {
		it('should debounce the value', async () => {
			const { result, rerender } = renderHook(
				({ value, delay }: { value: string; delay: number }) =>
					useDebounce(value, delay),
				{
					initialProps: { value: 'initial', delay: 100 },
				}
			);

			expect(result.current).toBe('initial');

			act(() => {
				rerender({ value: 'updated', delay: 100 });
			});

			expect(result.current).toBe('initial'); // Still initial value

			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 150));
			});

			expect(result.current).toBe('updated'); // Updated value
		});

		it('should use default delay if not provided', async () => {
			const { result, rerender } = renderHook(
				({ value }: { value: string }) => useDebounce(value),
				{
					initialProps: { value: 'initial' },
				}
			);

			expect(result.current).toBe('initial');

			act(() => {
				rerender({ value: 'updated' });
			});

			expect(result.current).toBe('initial'); // Still initial value

			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 550)); // Default delay is 500ms
			});

			expect(result.current).toBe('updated'); // Updated value
		});

		it('should update immediately if delay is 0', async () => {
			const { result, rerender } = renderHook(
				({ value, delay }: { value: string; delay: number }) =>
					useDebounce(value, delay),
				{
					initialProps: { value: 'initial', delay: 0 },
				}
			);

			expect(result.current).toBe('initial');

			act(() => {
				rerender({ value: 'updated', delay: 0 });
			});

			expect(result.current).toBe('initial');

			act(() => {
				rerender({ value: 'updated', delay: 0 });
			});

			await waitFor(() => expect(result.current).toBe('updated')); // Updated immediately
		});
	});
}
