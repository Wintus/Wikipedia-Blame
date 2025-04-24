import { renderHook, act, waitFor } from '@testing-library/react';
import useDebounce from '../useDebounce';
import { describe, it, expect } from 'vitest';

describe('useDebounce', () => {
	it('should debounce the value', async () => {
		const { result, rerender } = renderHook(
			({ value, delay }) => useDebounce(value, delay),
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
		const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
			initialProps: { value: 'initial' },
		});

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
			({ value, delay }) => useDebounce(value, delay),
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
