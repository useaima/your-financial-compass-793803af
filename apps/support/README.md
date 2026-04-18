# EVA Support Help Center

This folder is the source package for the separate `aima-support` repo and its Vercel project at `support.useaima.com`.

## What is included
- `index.html`: support shell with directory + article views
- `styles.css`: static responsive styling
- `app.js`: client-side routing, search, and article rendering
- `data.json`: help-center article content
- `vercel.json`: rewrite rules so `/articles/<id>` loads directly on Vercel

## Deployment target
Copy these files into the existing `aima-support` repo root, commit there, and deploy through the existing `aima-support` Vercel project.

This stays static on purpose so the support site remains fast, cheap, and easy to extend without coupling it to EVA backend releases.
