# Contributing to TalentTrack

Thank you for your interest in contributing to TalentTrack! This document provides guidelines for contributors.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a new branch for your feature: `git checkout -b feature/amazing-feature`
4. Make your changes
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## Development Setup

### Prerequisites
- Node.js 18+
- Python 3.8+
- Git

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Code Style

### Frontend (Next.js/TypeScript)
- Use TypeScript for all new code
- Follow React hooks best practices
- Use Tailwind CSS for styling
- Component names should be PascalCase
- File names should be kebab-case

### Backend (Python/FastAPI)
- Follow PEP 8 style guidelines
- Use type hints for function parameters and return values
- Add docstrings for all functions and classes
- Keep functions focused and small

## Project Structure

```
sports_talent_ecosystem/
├── frontend/                 # Next.js frontend
│   ├── app/                 # App router pages
│   ├── components/          # React components
│   └── lib/                 # Utilities and API client
├── backend/                 # FastAPI backend
│   ├── engines/             # AI/ML engines
│   ├── services/            # Business logic
│   └── data/                # JSON data storage
└── README.md
```

## Contributing Guidelines

### Bug Reports
- Use the issue tracker for bug reports
- Include steps to reproduce
- Provide environment details (OS, browser, etc.)

### Feature Requests
- Open an issue to discuss large changes
- Include user stories and acceptance criteria
- Consider the impact on existing features

### Pull Requests
- Keep PRs focused and small
- Update documentation as needed
- Add tests for new functionality
- Ensure all tests pass

## Areas for Contribution

### Frontend
- UI/UX improvements
- New components
- Performance optimizations
- Mobile responsiveness

### Backend
- API enhancements
- New AI/ML features
- Performance improvements
- Database optimizations

### AI/ML Engines
- New exercise detection
- Improved form analysis
- Enhanced injury detection
- Better training plan generation

## Testing

- Test your changes thoroughly
- Ensure existing functionality works
- Test on different browsers and devices
- Check console for errors

## Code Review Process

1. All submissions require review
2. Maintain professional and constructive feedback
3. Address review comments promptly
4. Keep discussions focused and technical

## Community

- Be respectful and inclusive
- Help newcomers get started
- Share knowledge and experience
- Follow the code of conduct

## Questions?

Feel free to open an issue for any questions about contributing to TalentTrack!