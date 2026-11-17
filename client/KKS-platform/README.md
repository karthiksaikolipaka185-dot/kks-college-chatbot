# KKS College Platform - Frontend Client

A modern, responsive web application for KKS College featuring an interactive campus portal, an AI-powered conversational chatbot, and a browser-based AI voice counselor.

---

## Overview

The **KKS College Platform** client provides prospective and current students with an engaging digital campus experience. Through intelligent conversational interfaces, users can explore academic programs, admissions criteria, campus facilities, and student events, or connect directly with an AI voice counselor for guided assistance.

---

## Features

- **Interactive AI Chat Assistant:** Instant, context-aware answers to college inquiries powered by Retrieval-Augmented Generation (RAG).
- **AI Voice Counselor:** Integrated browser voice assistance powered by Vapi for real-time spoken counseling and guidance.
- **Campus Portal & Navigation:** Detailed showcases for campus events, academic programs, and student resources.
- **Modern Responsive Design:** Fast, mobile-first interface styled with Tailwind CSS and Lucide icons.
- **Client-Side Routing:** Seamless navigation with React Router.

---

## Tech Stack

- **Framework:** [React 19](https://react.dev/)
- **Build Tool:** [Vite](https://vite.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Routing:** [React Router](https://reactrouter.com/)
- **HTTP Client:** [Axios](https://axios-http.com/)
- **Notifications:** [React Hot Toast](https://react-hot-toast.com/)

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.x or later recommended)
- `npm` (comes bundled with Node.js)

### Installation

1. Navigate to the client directory:
   ```bash
   cd client/KKS-platform
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

To start the Vite development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

The application will typically be accessible at `http://localhost:5173`.

### Production Build

To build the client application for production:

```bash
npm run build
```

This compiles TypeScript (`tsc -b`) and bundles assets into the `dist/` directory via Vite.

To preview the production build locally:

```bash
npm run preview
```

### Code Quality & Linting

To check code quality and lint rules across TypeScript and React files:

```bash
npm run lint
```

---

## Project Structure

```text
client/KKS-platform/
├── public/              # Static assets (favicons, SVG assets)
├── src/
│   ├── assets/          # Application media and styling assets
│   ├── components/      # Reusable UI components (ChatDrawer, VoiceAssistant, etc.)
│   ├── data/            # Static campus content and configuration
│   ├── pages/           # Routed page views (HomePage, LoginPage, etc.)
│   ├── App.tsx          # Root application component and layout
│   └── main.tsx         # Application entry point
├── package.json         # Client dependencies and npm scripts
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite build configuration
```

---

## License

This project is maintained for the KKS College platform.
