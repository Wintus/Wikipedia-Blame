import { useActionState } from 'react';
import { searchAction, initSearchState } from '../actions/search';

export function useSearchActionState() {
	return useActionState(searchAction, initSearchState);
}

// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect, vi } = import.meta.vitest;
	const { renderHook } = await import('@testing-library/react');

	vi.mock('react', () => ({
		...vi.importActual('react'),
		useActionState: vi.fn(),
	}));

	describe('useSearchActionState', () => {
		it('should call useActionState with searchAction and initSearchState', () => {
			// Arrange
			const mockUseActionState = vi.mocked(useActionState);
			// Act
			renderHook(() => useSearchActionState());
			// Assert
			expect(mockUseActionState).toHaveBeenCalledWith(
				searchAction,
				initSearchState
			);
		});

		it('should return the values returned by useActionState', () => {
			// Arrange
			const mockUseActionState = vi.mocked(useActionState);
			const mockReturnValue: [unknown, (formData: unknown) => void, boolean] = [
				{ ...initSearchState, searchCount: 1 },
				vi.fn(),
				true,
			];
			mockUseActionState.mockReturnValue(mockReturnValue);
			// Act
			const { result } = renderHook(() => useSearchActionState());
			// Assert
			expect(result.current).toEqual(mockReturnValue);
		});
	});
}
