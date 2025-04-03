# TDD Workflow Rule

## Overview
This rule enforces Test-Driven Development (TDD) practices by ensuring every source file has corresponding tests that follow our naming convention.

## Test File Pattern
- Test files must be located in `__tests__/$basename.test.$ext` relative to the source file
- Example: For `src/components/SearchForm.tsx` → `src/components/__tests__/SearchForm.test.tsx`

## Workflow Requirements
1. Every new source file must have a corresponding test file
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

### Component Test Example
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { YourComponent } from '../YourComponent';

describe('YourComponent', () => {
  it('renders correctly with default props', () => {
    render(<YourComponent />);
    // Add assertions here
  });

  it('handles user interactions correctly', () => {
    // Test interactions
  });

  it('displays error states appropriately', () => {
    // Test error states
  });
});
```

### Service/Utility Test Example
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { yourFunction } from '../yourModule';

describe('yourFunction', () => {
  beforeEach(() => {
    // Setup
  });

  it('returns expected result for valid input', () => {
    // Test normal case
  });

  it('handles edge cases correctly', () => {
    // Test edge cases
  });

  it('throws appropriate error for invalid input', () => {
    // Test error handling
  });
});
