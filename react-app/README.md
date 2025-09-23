# React Influencer Dashboard

This is the React version of the Influencer Data Visualization dashboard, converted from the original vanilla JavaScript application.

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The application will be available at http://localhost:5173/

## Build

```bash
npm run build
```

## Features

- **Influencer data visualization** with card and table views
- **Search functionality** across name, account ID, captions, and tags
- **Advanced filtering** by influencer type, follower tier, and email status
- **Sorting capabilities** for all major metrics
- **Contact status tracking** with persistent localStorage
- **Pagination** with customizable items per page
- **TikTok video embedding** in modal windows
- **Detail modal** with comprehensive influencer statistics
- **Korean language interface**
- **Responsive design** that matches the original application

## File Structure

```
src/
├── components/         # React components
│   ├── Header/        # Header and summary cards
│   ├── Tabs/          # Influencer type tabs
│   ├── Controls/      # Search, filter, sort controls
│   ├── Views/         # Card and table views
│   ├── Modals/        # Detail and video modals
│   ├── Pagination/    # Pagination component
│   └── common/        # Shared components
├── services/          # Business logic services
│   ├── ContactStatusService.js
│   └── TagsService.js
├── utils/            # Utility functions
│   ├── formatters.js
│   └── constants.js
├── styles/           # CSS styles
│   └── styles.css    # Original styles preserved
└── App.jsx           # Main application component
```

## Data

The application loads data from `/public/data_combined.json` which contains:
- Influencer information
- Statistics and metrics
- Summary data for different influencer types

## Key Differences from Original

- **Component-based architecture**: Modular React components
- **State management**: React hooks for state management
- **Performance optimizations**: useMemo and useCallback hooks
- **Modern build system**: Vite for fast development and builds
- **Maintained compatibility**: All original features preserved
