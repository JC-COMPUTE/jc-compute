# Contributing to JC Compute

Thank you for your interest in contributing to JC Compute! This document provides guidelines for contributing to the project.

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js >= 16
- npm >= 7
- TypeScript knowledge
- Git

### Development Setup

```bash
# Clone the repository
git clone https://github.com/xhecarpenxer/jc-compute.git
cd jc-compute

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start development mode
npm run dev
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation
- `test/` — Tests
- `refactor/` — Code refactoring
- `perf/` — Performance improvements

### 2. Make Changes

Follow the coding standards below.

### 3. Write Tests

Add tests for your changes:
- Unit tests in `tests/unit/`
- Integration tests in `tests/integration/`
- Aim for >80% coverage

```bash
npm test -- --coverage
```

### 4. Update Documentation

Update relevant docs:
- API documentation if changing public APIs
- Architecture docs if changing system design
- Examples if adding new features

### 5. Commit Your Changes

Follow commit message conventions:

```
feat(core): add causal graph verification
fix(replay): handle edge case in state projection
docs(guide): improve reducer documentation
test(distributed): add synchronization tests
refactor(storage): simplify event store interface
perf(replay): optimize causal ordering validation
```

Format: `type(scope): subject`

Types:
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation
- `test` — Tests
- `refactor` — Code refactoring
- `perf` — Performance
- `ci` — CI/CD
- `chore` — Build, dependencies, etc.

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Create a PR with:
- Clear title describing the change
- Description of what and why
- Reference to related issues
- Test coverage information

## Coding Standards

### TypeScript

- Strict mode enabled
- Explicit types for public APIs
- No `any` without justification
- Use interfaces for contracts

```typescript
// Good
interface EventStore<E> {
  append(event: Event<E>): Promise<void>;
  read(id: string): Promise<Event<E> | null>;
}

// Avoid
type EventStore = any;
```

### Formatting

```bash
npm run format
```

- 2-space indentation
- 80-character line limit for comments
- 100-character limit for code
- Single quotes for strings
- Trailing commas in multiline

### Linting

```bash
npm run lint
```

Rules enforced by ESLint:
- No unused variables
- No console logs in production code
- Consistent naming
- No implicit any

### Testing

- Write tests alongside code
- Test happy paths and edge cases
- Use descriptive test names
- Aim for >80% coverage

```typescript
// Good
describe('Reducer', () => {
  it('should increment counter when INCREMENT event received', () => {
    const state = { value: 0 };
    const event = { type: 'INCREMENT' };
    const result = counterReducer(state, event);
    expect(result.value).toBe(1);
  });

  it('should not mutate original state', () => {
    const state = { value: 0 };
    const event = { type: 'INCREMENT' };
    counterReducer(state, event);
    expect(state.value).toBe(0);
  });
});
```

## Key Principles to Maintain

### 1. Determinism

All reducers and transformations must be deterministic:

```typescript
// Good: deterministic
const reducer = (state, event) => ({
  ...state,
  count: state.count + event.value
});

// Bad: non-deterministic
const reducer = (state, event) => ({
  ...state,
  count: state.count + Math.random()
});
```

### 2. Immutability

Never mutate input parameters:

```typescript
// Good: creates new object
const reducer = (state, event) => ({
  ...state,
  items: [...state.items, event.item]
});

// Bad: mutates state
const reducer = (state, event) => {
  state.items.push(event.item);
  return state;
};
```

### 3. Pure Functions

No side effects in core logic:

```typescript
// Good: pure
const reducer = (state, event) => calculateNewState(state, event);

// Bad: side effects
const reducer = (state, event) => {
  localStorage.setItem('state', JSON.stringify(state));
  return calculateNewState(state, event);
};
```

### 4. Causal Consistency

Maintain causal relationships:

```typescript
// When creating events with dependencies
const event = {
  type: 'UPDATE',
  payload: { ... },
  parentEventId: previousEventId,  // Link to cause
};
```

## Areas for Contribution

### High Priority

- [ ] Complete reducer examples
- [ ] Distributed sync implementation
- [ ] Capability system enforcement
- [ ] Event storage backends (PostgreSQL, MongoDB)
- [ ] Comprehensive test coverage

### Medium Priority

- [ ] Performance optimization
- [ ] Additional examples
- [ ] Documentation improvements
- [ ] Snapshot strategies
- [ ] Network efficiency

### Low Priority

- [ ] Language bindings
- [ ] Visualization tools
- [ ] Community examples
- [ ] Integration examples

## Pull Request Process

1. **Ensure Tests Pass**
   ```bash
   npm test
   npm run build
   npm run lint
   ```

2. **Update Documentation**
   - Update API docs if APIs changed
   - Update examples if behavior changed
   - Update CHANGELOG.md

3. **Describe Changes**
   - What problem does it solve?
   - How does it work?
   - Any breaking changes?
   - Test coverage?

4. **Request Review**
   - Tag relevant maintainers
   - Link related issues
   - Provide context

5. **Address Feedback**
   - Respond to all comments
   - Make requested changes
   - Re-request review

## Documentation Style

### Code Comments

```typescript
// Good: explains why, not what
// We need to verify causal order before replay
// to ensure deterministic execution
if (!verifyCausalOrder(history)) {
  throw new Error('Causal order violated');
}

// Bad: obvious from code
// Check if causal order is verified
if (!verifyCausalOrder(history)) {
```

### Markdown

- Use clear headings
- Include code examples
- Explain concepts simply
- Link to related docs
- Add diagrams for complex flows

## Reporting Issues

### Bug Reports

Include:
- What you were trying to do
- What happened
- What should have happened
- Steps to reproduce
- Environment details

### Feature Requests

Include:
- Problem it solves
- Proposed solution
- Alternative approaches
- Use cases

### Questions

Use GitHub Discussions for questions.

## Release Process

Only maintainers can release. Process:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create release commit
4. Create git tag
5. Publish to npm
6. Create GitHub release

## Resources

- **[Architecture](./ARCHITECTURE.md)** — System design
- **[Getting Started](./docs/guides/getting-started.md)** — Tutorial
- **[API Reference](./docs/api/)** — Documentation
- **[Examples](./examples/)** — Code samples

## Questions?

- Check existing issues and discussions
- Ask in GitHub Discussions
- Email: xhecarpenxer@gmail.com

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md
- GitHub contributors page
- Release notes

Thank you for contributing to JC Compute! 🚀
