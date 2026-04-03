# Windows Setup & Build Guide - Mersal Info Center

This application is built with Electron and uses native SQLite modules. Follow these steps to set up the development environment and generate the Windows executable (**EXE**).

## 1. Prerequisites (Mandatory)

Before you start, ensure you have the following installed on your Windows machine:

1.  **Node.js (LTS Version):** Download from [nodejs.org](https://nodejs.org/).
2.  **Git for Windows:** Download from [git-scm.com](https://git-scm.com/).
3.  **Visual Studio Build Tools (for better-sqlite3):**
    *   The app uses a native SQLite library that must be compiled for Windows.
    *   Open PowerShell as Administrator and run:
        ```powershell
        npm install --global windows-build-tools
        ```
    *   *Alternatively*, download the [Visual Studio Installer](https://visualstudio.microsoft.com/downloads/), and select **"Desktop development with C++"** during setup.

## 2. Installation

1.  Clone the repository:
    ```bash
    git clone [REPO_URL]
    cd mersal-info-center
    ```
2.  Install dependencies and rebuild native modules:
    ```bash
    npm install
    ```
    *(The `postinstall` script will automatically run `electron-rebuild` to ensure SQLite works on your Windows version).*

## 3. Running the App (Development)

To launch the app in development mode:
```bash
npm start
```

## 4. Generating the Windows EXE (Building)

To create a standalone installer and portable version:
```bash
npm run build:win
```
The output will be generated in the `build/` folder as:
*   `Mersal Info Center Setup.exe` (Installer)
*   `Mersal Info Center.exe` (Portable version)

---

### Troubleshooting native module errors
If you see an error like `The module better-sqlite3 was compiled against a different version of Node.js`, run:
```bash
npm run rebuild
```
