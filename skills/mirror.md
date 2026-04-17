---
name: Mirror Mode
description: Executes `npm run mirror` to watch for changes in source files and immediately recompile/update `dist/index.html`.
---

# Mirror Mode

This skill enables a "mirror" mode where any changes you make to the source code (in `src/` or project root) are automatically detected, recompiled, and updated in the `dist/` directory.

## Instructions

To start the mirror process:

1.  Open a terminal.
2.  Run the following command:

    ```bash
    npm run mirror
    ```

## Details

-   **Command**: `npm run mirror` (runs `vite build --watch`)
-   **Behavior**: Watches for file modifications.
-   **Output**: Updates `dist/index.html` (and assets) in real-time.
-   **Note**: Keep the terminal running to maintain the watch process.
