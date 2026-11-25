# KKS College Chatbot & Intelligence Platform

An AI-powered conversational platform for KKS College, featuring an interactive campus web portal, a Retrieval-Augmented Generation (RAG) assistant, and a real-time AI voice counselor.

---

## Project Structure

This repository is organized as a monorepo containing:

- **Frontend (`client/KKS-platform`):** Modern web client built with React 19, Vite, TypeScript, and Tailwind CSS.
- **Backend (`server/server`):** Express service featuring LangChain RAG integration, vector search, and Vapi voice counseling.

---

## DevOps CI Integration

- **Source Code Management:** GitHub is used for source code management and repository hosting.
- **Continuous Integration:** Jenkins is configured for automated Continuous Integration pipelines.
- **Webhook Automation:** GitHub Webhooks notify the Jenkins server automatically whenever code is pushed to the repository.
- **Automated Dependency Installation & Builds:** Jenkins automatically installs dependencies (`npm ci`) and builds both the frontend and backend applications to ensure continuous build stability.
- **CI Verification:** Documentation-only commits can be used to verify automatic Jenkins pipeline execution through GitHub Webhooks.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Axios
- **Backend:** Node.js, Express 5, TypeScript, LangChain, Mongoose, Vapi SDK
- **CI/CD:** Jenkins, GitHub Webhooks, Windows Agent

---

## Production Deployments

- **Frontend:** [https://kks-chatbot-frontend.vercel.app](https://kks-chatbot-frontend.vercel.app)
- **Backend:** [https://kks-chatbot-backend.vercel.app](https://kks-chatbot-backend.vercel.app)
