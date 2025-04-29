# TDD Workflow Rule

## Overview

This rule enforces Test-Driven Development (TDD) practices by ensuring every source file has corresponding tests that follow our naming convention.
See the Vitest in-source testing guide for more information: https://vitest.dev/guide/in-source

## Test File Pattern

- Tests must be located in the same file as the source code, within an `if (import.meta.vitest)` block.

## Workflow Requirements

1. Every new source file should have a corresponding test block
2. Tests should be written before or alongside implementation (TDD approach)
3. Run tests after every significant code change using `npm test`
4. Tests must pass before committing changes
5. When fixing bugs, first write a failing test that reproduces the issue

## Test Content Requirements

- Descriptive test cases using `describe` and `it` blocks
- Coverage for all public methods/functions
- Edge cases and error handling tests
- Appropriate mocks for dependencies

## Best Practices

- Start with failing tests to verify test correctness
- Keep tests isolated and independent
- Mock external dependencies and APIs
- Use meaningful test descriptions that document behavior
- Focus on behavior, not implementation details
- Aim for comprehensive but maintainable test coverage
- Use `npm test:watch` during development for continuous feedback

## Code Examples

### Component Example (In-Source Test)

```tsx
// src/components/YourComponent.tsx

export function YourComponent(/* props */) {
	// Component implementation
	return <div>Your Component Content</div>;
}

// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;
	const { render, screen } = await import('@testing-library/react');

	describe('YourComponent', () => {
		it('renders correctly with default props', () => {
			render(<YourComponent />);
			expect(screen.getByText('Your Component Content')).toBeInTheDocument();
			// Add more assertions here
		});

		it('handles user interactions correctly', () => {
			// Test interactions within the component file
		});

		it('displays error states appropriately', () => {
			// Test error states within the component file
		});
	});
}
```

### Service/Utility Example (In-Source Test)

```ts
// src/utils/yourModule.ts

export function yourFunction(input: string): string {
	if (!input) {
		throw new Error('Input cannot be empty');
	}
	// Function implementation
	return `Processed: ${input}`;
}

// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect, beforeEach, afterEach, vi } = import.meta
		.vitest;

	describe('yourFunction', () => {
		beforeEach(() => {
			// Setup specific to tests in this file
		});

		afterEach(() => {
			// Teardown specific to tests in this file
			vi.restoreAllMocks();
		});

		it('returns expected result for valid input', () => {
			expect(yourFunction('test')).toBe('Processed: test');
			// Test normal case
		});

		it('handles edge cases correctly', () => {
			// Test edge cases within the utility file
		});

		it('throws appropriate error for invalid input', () => {
			expect(() => yourFunction('')).toThrow('Input cannot be empty');
			// Test error handling
		});
	});
}
```
