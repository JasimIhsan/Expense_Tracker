# Expense Tracker

A modern, full-stack expense tracking application built with Next.js, designed to help you manage your personal finances with ease.

## Features

- **Transaction Management**: Track both **Income** and **Expenses** seamlessly.
- **Categorization**: Organize transactions with custom categories (specific to income or expense).
- **Financial Dashboard**: Get a quick overview of your **Total Balance**, **Income**, and **Expense**.
- **Advanced Statistics**:
   - Visualize **Income vs Expense** comparisons.
   - Analyze **Category Breakdowns** with interactive charts.
   - Track **Average Daily Expenses**.
   - Toggle between **Monthly** and **Yearly** views.
- **Responsive Design**: Fully responsive UI tailored for mobile and desktop.
- **Dark Mode**: Built-in dark mode support for better accessibility.
- **Localization**: Currency formatted for Indian Rupees (₹).

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Charts**: [Recharts](https://recharts.org/)

## Getting Started

Follow these steps to set up the project locally.

### Prerequisites

- Node.js (v18 or later)
- PostgreSQL database

### Installation

1. **Clone the repository:**

   ```bash
   git clone <repository_url>
   cd expense-tracker
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up Environment Variables:**

   Create a `.env` file in the root directory and add your database connection string:

   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/expense_tracker?schema=public"
   ```

4. **Database Setup:**

   Run migrations to set up the database schema:

   ```bash
   npx prisma migrate dev
   ```

   (Optional) Seed the database with initial categories:

   ```bash
   npx prisma db seed
   ```

### Running the App

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Runs ESLint to check for code quality issues.

## License

This project is open-source and available under the [MIT License](LICENSE).
