# Contributing to ngx-flexigraph

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/ShubhankNagar/FlexiGraph.git
cd FlexiGraph

# Install dependencies
npm install

# Build the library
npm run build:lib

# Start the demo app
ng serve demo
```

## Project Structure

- `projects/ngx-flexigraph/` - The library source code
- `projects/demo/` - Demo application

## Making Changes

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Build and test: `npm run build:lib`
4. Commit with conventional commits: `git commit -m "feat: add feature"`
5. Push and create a PR

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting
- `refactor:` - Code restructuring
- `test:` - Adding tests
- `chore:` - Maintenance

## Code Style

- Use TypeScript strict mode
- Follow Angular style guide
- Add JSDoc comments for public APIs

## Questions?

Open an issue or start a discussion!
