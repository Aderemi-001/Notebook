---
description: how to deploy changes to GitHub
---

Follow these steps to save and upload your progress to GitHub:

1.  **Check what has changed**:
    ```powershell
    git status
    ```

2.  **Stage (Select) your files**:
    - To add all changes:
      ```powershell
      git add .
      ```
    - To add specific files:
      ```powershell
      git add <filename>
      ```

3.  **Commit (Save) your changes**:
    Write a clear message about what you did.
    ```powershell
    git commit -m "Brief description of changes"
    ```

4.  **Push (Upload) to GitHub**:
    ```powershell
    git push origin main
    ```

> [!TIP]
> Always run `git status` first to make sure you aren't accidentally adding files you didn't mean to (like large log files or API keys).
