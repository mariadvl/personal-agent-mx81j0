# Contributing to Personal AI Agent

Thank you for your interest in contributing to the Personal AI Agent project! This document provides guidelines and instructions for contributing to make the process smooth and effective.

The Personal AI Agent is a local-first, memory-augmented AI companion designed to provide users with a private, customizable assistant that stores all information directly on their devices. Our project prioritizes user privacy, data sovereignty, and high-quality code.

## Code of Conduct

This project adheres to a [Code of Conduct](../CODE_OF_CONDUCT.md) that all contributors are expected to follow. Please read it before participating in this project.

## Getting Started

### Prerequisites

To contribute to this project, you'll need:

- Python 3.11 or higher
- Node.js 18 or higher
- Git
- A GitHub account

### Development Environment Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/personal-ai-agent.git
cd personal-ai-agent

# Set up backend environment
cd src/backend
python -m pip install poetry
poetry install

# Set up frontend environment
cd ../web
npm install -g pnpm
pnpm install
```

### Project Structure

The repository is organized as follows:

- `src/backend/`: Python backend with FastAPI server, vector database, and LLM integration
- `src/web/`: TypeScript frontend with Next.js for web and Electron for desktop
- `src/web/react-native/`: React Native mobile application
- `docs/`: Project documentation
- `.github/`: GitHub workflows and templates
- `infrastructure/`: Deployment and infrastructure configuration

## Development Workflow

### Branching Strategy

We follow a simplified Git flow approach:

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches
- `hotfix/*`: Urgent fixes for production

### Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Common types include:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `test`: Adding or updating tests
- `perf`: Performance improvements
- `chore`: Changes to the build process or auxiliary tools

Example:
```
feat(memory): add vector similarity search for context retrieval

Implements efficient similarity search using HNSW algorithm in ChromaDB.
This improves context retrieval speed by 40%.

Closes #123
```

### Issue Tracking

- Check existing issues before creating a new one
- Use issue templates when available
- Link PRs to relevant issues
- Use labels appropriately

## Pull Request Process

### Creating a Pull Request

1. Create a new branch from `develop` (or `main` for hotfixes)
2. Make your changes with appropriate tests and documentation
3. Push your branch to your fork
4. Create a pull request to the original repository

```bash
# Create a new branch
git checkout -b feature/your-feature-name

# Make your changes and commit them
git add .
git commit -m "feat: add your feature description"

# Push to your fork
git push origin feature/your-feature-name
```

5. Fill out the PR template completely

### Code Review Process

- All PRs require at least one review from a maintainer
- Automated checks must pass (tests, linting, etc.)
- Address all comments and requested changes

### Addressing Feedback

- Respond to all comments
- Make requested changes in the same branch
- Push updates to your branch to update the PR
- Use the "Request Review" feature when ready for re-review

### Merge Requirements

Before a PR can be merged, it must:

1. Have at least one approving review from a maintainer
2. Pass all automated checks (CI/CD pipeline)
3. Meet code coverage requirements
4. Have no unresolved comments
5. Be up-to-date with the target branch

## Coding Standards

### Python Guidelines

- Follow [PEP 8](https://peps.python.org/pep-0008/) and the [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)
- Use type hints for all function parameters and return values
- Document all functions, classes, and modules with docstrings
- Maximum line length: 100 characters
- Use `black` for formatting and `isort` for import sorting
- Use `flake8` and `mypy` for linting

Example:

```python
def calculate_similarity(vector1, vector2):
    """Calculate cosine similarity between two vectors.
    
    Args:
        vector1: First vector as numpy array
        vector2: Second vector as numpy array
        
    Returns:
        float: Cosine similarity score between 0 and 1
    """
    # Implementation
    pass
```

### TypeScript Guidelines

- Follow the [TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- Use strict type checking
- Use interfaces for object shapes
- Use functional components with hooks for React
- Use ESLint and Prettier for linting and formatting
- Maximum line length: 100 characters

Example:

```typescript
/**
 * Format a conversation message for display
 * @param message The raw message object
 * @param options Formatting options
 * @returns Formatted message string
 */
function formatMessage(message: Message, options?: FormatOptions): string {
  // Implementation
}
```

### General Principles

- Write self-documenting code with clear variable and function names
- Follow the Single Responsibility Principle
- Write testable code
- Prioritize readability over cleverness
- Keep functions and methods small and focused
- Avoid deep nesting
- Handle errors appropriately

## Testing Requirements

Refer to our detailed [Testing Strategy](./TESTING.md) for comprehensive testing guidelines.

### Unit Testing

- Backend: Use [Pytest](https://docs.pytest.org/) with minimum 85% code coverage
- Frontend: Use [Jest](https://jestjs.io/) with React Testing Library with minimum 80% code coverage
- Test all public functions and methods
- Use mocks for external dependencies
- Follow the Arrange-Act-Assert pattern

```bash
# Run backend tests
cd src/backend
poetry run pytest

# Run frontend tests
cd src/web
pnpm test
```

### Integration Testing

- Test API endpoints using FastAPI TestClient
- Test service interactions
- Test database operations
- Test external service integrations with mocks

### End-to-End Testing

- Use Cypress for web E2E tests
- Test complete user flows
- Test across supported browsers

### Performance Testing

- Include benchmarks for performance-critical code
- Test memory retrieval performance
- Test response time for critical operations

### Accessibility Testing

- Ensure WCAG 2.1 AA compliance
- Test keyboard navigation
- Test screen reader compatibility

## Documentation Guidelines

### Code Documentation

- Document all public functions, classes, and modules
- Include parameter descriptions, return values, and exceptions
- Document complex algorithms and business logic
- Keep documentation up-to-date with code changes

### Project Documentation

- Update relevant documentation when making changes
- Use clear, concise language
- Include examples where appropriate
- Follow Markdown best practices

### Example Documentation

See the docstring examples in the Coding Standards section.

## Privacy and Security Considerations

### Privacy-First Development

The Personal AI Agent is built on a privacy-first philosophy. All contributions must adhere to these principles:

- All user data must be stored locally by default
- Any cloud features must be strictly opt-in
- Be transparent about data usage
- Minimize data collection
- Provide user control over all data

### Security Best Practices

Refer to our [Security Policy](../SECURITY.md) for detailed security guidelines.

- Use encryption for sensitive data
- Follow secure coding practices
- Validate all inputs
- Use parameterized queries for database operations
- Keep dependencies updated
- Never commit secrets or credentials

### Data Handling Guidelines

- Treat all user data as sensitive
- Implement proper data sanitization
- Provide clear data deletion mechanisms
- Use secure storage for API keys and credentials
- Implement proper error handling without leaking sensitive information

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH):

- MAJOR: Incompatible API changes
- MINOR: Backwards-compatible new functionality
- PATCH: Backwards-compatible bug fixes

### Release Workflow

1. Features are merged into `develop`
2. When ready for release, `develop` is merged into `main`
3. A release tag is created (e.g., `v1.2.0`)
4. The CI/CD pipeline builds and publishes the release

Releases follow a phased rollout:
1. Alpha: Internal testing
2. Beta: Limited user testing
3. Production: General availability

### Hotfix Process

For critical issues in production:

1. Create a `hotfix/*` branch from `main`
2. Fix the issue with appropriate tests
3. Create a PR to merge back to `main`
4. After merging, create a new patch release
5. Backport the fix to `develop`

## Community and Communication

### Discussion Forums

- GitHub Discussions: General questions and ideas
- Project Wiki: Documentation and guides
- Community Chat: Real-time discussions

### Issue Reporting

- Use the issue templates
- Provide detailed reproduction steps
- Include relevant logs and screenshots
- Label issues appropriately

### Feature Requests

- Use the feature request template
- Clearly describe the problem and proposed solution
- Explain the value to users
- Consider implementation complexity

## Acknowledgments

We appreciate all contributors who help make this project better! Contributors will be acknowledged in our documentation and release notes.

---

Thank you for contributing to the Personal AI Agent project! Your efforts help create a privacy-focused, user-friendly AI companion that respects user data and provides valuable assistance.