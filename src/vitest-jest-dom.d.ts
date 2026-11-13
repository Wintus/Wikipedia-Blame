/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars -- The augmentation has to mirror vitest's `Assertion<R, T>` signature, including its unused `R`. */
// @testing-library/jest-dom 6.9.1 declares `Assertion<T>` with a single type
// parameter, but vitest 5 declares `Assertion<R, T>`. The mismatched merge
// hides every jest-dom matcher from TypeScript, so re-declare the augmentation
// with vitest 5's signature until jest-dom ships a compatible one.
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import 'vitest';

declare module 'vitest' {
	interface Assertion<
		R extends void | Promise<void> = void,
		T = unknown,
	> extends TestingLibraryMatchers<any, T> {}

	interface AsymmetricMatchersContaining extends TestingLibraryMatchers<
		any,
		any
	> {}
}
