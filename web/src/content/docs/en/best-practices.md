---
title: 'Best Practices & Dependencies'
description: 'Learn how to structure your code for JIT delivery and manage dependencies with LC:Require.'
icon: "build"
---To align your legacy code to the cloud architecture and leverage Just-In-Time (JIT) loading, follow these rules:

- **Centralize Logic:** A downloaded file loads all its internal commands into memory instantly. Group related commands.
- **LC:Require:** If a script depends on another (e.g. math library), use `(LC:Require "LibraryName")` at the top of your LISP.
- **Suite Permissions:** The main file and its dependencies MUST belong to the same Suite in LispCentral to pass DRM checks.