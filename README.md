# bookshelf-demo-v1

a demo of the supershop simulation project. this is version 1

## Run the demo locally

Install [Node.js](https://nodejs.org/) if needed, then run these commands in the project folder:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite.

## Share the online demo

The version 2 demo is published from the `version-2` branch with GitHub Pages:

https://trustedmockingbird-hash.github.io/bookshelf-demo-v1/

Pushes to `version-2` automatically build and publish the site. The site is public. This is a front-end demo: its admin passwords are examples, and visit data is kept in each browser's local storage. Use only fake/test data; this is not suitable for real participant data or secure administration.

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
