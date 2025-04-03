# Multi-Page Dashboard

This is a multi-page dashboard built using **Next.js**, **Redux**, and **TailwindCSS**. It provides an intuitive and user-friendly interface for managing and visualizing data across multiple pages.

## Features

- **Multi-page navigation** using Next.js App Router
- **Global state management** with Redux Toolkit
- **Responsive design** with TailwindCSS
- **Optimized performance** with server-side rendering (SSR) and static generation (SSG)
- **Reusable UI components** for a consistent look and feel

## Technologies Used

- **Next.js** - React framework for server-side rendering and static site generation
- **Redux Toolkit** - State management
- **TailwindCSS** - Utility-first CSS framework for styling

## Setup & Installation

### Prerequisites

Ensure you have the following installed:

- **Node.js** (LTS recommended)
- **npm** or **yarn** package manager

### Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/KingrogKDR/multi-page-Dashboard.git
   cd multi-page-Dashboard
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

3. Run the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

   The dashboard should now be accessible at `http://localhost:3000/`.

4. Build for production:

   ```bash
   npm run build
   npm start
   ```

## Project Structure

```
├── components/       # Reusable UI components
├── app/              # Next.js App Router and server components
├── redux/            # Redux store and slices
├── public/           # Static assets
├── .env.local        # Environment variables (not included in repo)
├── package.json      # Project dependencies and scripts
└── README.md         # Project documentation
```

## Usage Guide

- **Navigation**: Uses Next.js App Router (`app/` directory) with server components and dynamic routes.
- **State Management**: Redux Toolkit is used for global state management. You can find slices inside `store/`.
- **Styling**: TailwindCSS is used for styling. Custom styles can be added in `styles/`.
- **API Integration**: Data fetching is handled using React Server Components and `fetch` within Server Actions.

## Design Decisions

- **Next.js App Router for Modern Architecture**: Uses server components and client components for optimized rendering.
- **Redux Toolkit for State Management**: Helps manage complex application state efficiently.
- **TailwindCSS for Styling**: Ensures consistency, responsiveness, and maintainability.
- **Component-based Approach**: UI elements are modular and reusable to improve scalability.

## Future Enhancements

- Implement authentication and authorization
- Add dark mode support
- Enhance UI with animations and micro-interactions
- Improve accessibility features

## Contributing

Contributions are welcome! Follow these steps:

1. Fork the repository
2. Create a new branch: `git checkout -b feature-branch`
3. Commit your changes: `git commit -m 'Add new feature'`
4. Push to the branch: `git push origin feature-branch`
5. Submit a pull request

## License

This project is licensed under the MIT License. Feel free to modify and use it as per your needs.

