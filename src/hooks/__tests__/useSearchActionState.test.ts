import { renderHook } from '@testing-library/react';
import { useSearchActionState } from '../useSearchActionState';
import { searchAction, defaultSearchResult } from '../../actions/search';
import { useActionState } from 'react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react', () => ({
	...vi.importActual('react'),
	useActionState: vi.fn(),
}));

describe('useSearchActionState', () => {
	it('should call useActionState with searchAction and defaultSearchResult', () => {
		// Arrange
		const mockUseActionState = vi.mocked(useActionState);
		// Act
		renderHook(() => useSearchActionState());
		// Assert
		expect(mockUseActionState).toHaveBeenCalledWith(
			searchAction,
			defaultSearchResult
		);
	});

	it('should return the values returned by useActionState', () => {
		// Arrange
		const mockUseActionState = vi.mocked(useActionState);
		const mockReturnValue: [unknown, (formData: unknown) => void, boolean] = [
			{ ...defaultSearchResult, searchCount: 1 },
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
