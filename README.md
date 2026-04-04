# pruins-web 🫐

**pruins-web** is a premium React single-page application and client for the Pruna AI API. It features a "local-first" architecture using IndexedDB for history and asset persistence, all within a sleek Mantine-based UI.

## 🚀 Getting Started

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Start development server**:
    ```bash
    npm run dev
    ```
3.  **Build for production**:
    ```bash
    npm run build
    ```

## 🧠 AI Agent Guidance

If you are an AI assistant (Claude, Cursor, GPT, etc.), please refer to the following files for project-specific instructions and conventions:

- [**AGENTS.md**](./AGENTS.md): Comprehensive project overview, tech stack, data models, and core logic.
- [**.cursorrules**](./.cursorrules): Specific rules for coding conventions, Mantine v9 usage, and data persistence.

## 🛠️ Key Technologies

- **Frontend**: React 19, Vite 8, TypeScript
- **UI Framework**: Mantine v9
- **Persistence**: Dexie (IndexedDB)
- **Animations**: Framer Motion
- **Icons**: Lucide React

## 🗂️ Project Structure

- `src/api/`: Core API client for Pruna AI.
- `src/components/`: Modular React components.
- `src/db/`: IndexedDB schema and database operations.
- `src/App.tsx`: Main application shell.

## 🔐 Credentials

API keys are managed locally within the application and stored securely in the browser's IndexedDB. No server-side storage of keys is performed.
