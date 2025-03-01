# Wikipedia-Blame

A tool for finding when specific text first appeared in Wikipedia articles, similar to git blame functionality.

## Project Overview

Wikipedia-Blame is a React-based single-page application that helps users identify when specific text was first added to Wikipedia articles.
By leveraging the Wikipedia API, it searches through revision history to pinpoint the exact revision where text first appeared.

### Features

- Search for text across all revisions of a Wikipedia article
- Support for both English and Japanese Wikipedia
- Efficient search algorithm using randomized sampling with fallback to exhaustive search
- Direct links to the specific revision where text first appeared

## Technical Stack

- React with TypeScript
- Vite for build tooling
- Wikipedia API integration
- GitHub Pages for hosting

## Project Structure

- **Components**: UI elements (SearchForm, ResultView, LanguageSelector, etc.)
- **API Services**: Wikipedia API integration
- **Utilities**: Search algorithms and text processing
- **Types**: TypeScript type definitions

## Development Roadmap

1. Project Setup - Initialize React app with TypeScript and Vite
2. Core Components - Create basic UI components
3. API Integration - Implement Wikipedia API service
4. Search Algorithm - Implement efficient revision search
5. Styling - Add minimal, clean styling
6. Language Support - Add support for Japanese Wikipedia
7. Testing & Refinement - Test functionality and fix issues
8. Deployment - Set up GitHub Pages deployment

## Future Extensions

- Find first addition/deletion of text
- User selection to search further
- Find last occurrence of text
- Visual highlighting of changes
- Support for additional Wikipedia languages
