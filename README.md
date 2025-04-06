This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Vesperance Project Structure

This project follows a standard structure for organizing source code within the `src` directory.

## `src` Directory

Contains all the source code for the application.

### `src/app`

This directory contains the main application pages and routing logic, following the Next.js App Router conventions. Each folder typically represents a route.

### `src/components`

Houses reusable UI components used across different parts of the application. Examples include buttons, input fields, modals, etc.

### `src/constants`

Stores constant values used throughout the application.
- `translations.ts`: Contains text strings for different languages (e.g., English, Nepali).

### `src/context`

Contains React Context providers for managing global or shared application state.
- `AuthContext.tsx`: Manages user authentication state.
- `LanguageContext.tsx`: Manages the current application language.

### `src/models`

Defines data structures, interfaces, or types used within the application. (Currently empty, but intended for data models).

### `src/services`

Contains modules responsible for interacting with external services or APIs.
- `firebase/config.ts`: Handles Firebase initialization and configuration.

### `src/utils`

Includes utility functions that are reusable and not specific to any particular feature or component. (Currently empty, but intended for helper functions).

## Other Root Files

- `next.config.mjs`: Configuration for the Next.js framework.
- `package.json`: Lists project dependencies and scripts.
- `tsconfig.json`: TypeScript configuration.
- `.env.local`: Environment variables (should not be committed to version control).
- `postcss.config.js`, `tailwind.config.ts`: Configuration for styling (PostCSS, Tailwind CSS).
