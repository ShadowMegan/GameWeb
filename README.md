# React + Vite

## Backend de autenticación

El frontend lee `VITE_AUTH_API_URL` durante la compilación. Configura esa variable
en Vercel en **Project Settings → Environment Variables** con el dominio base del
backend, por ejemplo `https://gameweb-u50w.onrender.com`. También se acepta una
URL que ya termine en `/api/auth`. Después de cambiarla, vuelve a desplegar el
proyecto. Si no defines la variable, se utiliza `https://gameweb-u50w.onrender.com`.

El backend también debe permitir mediante CORS el dominio donde se despliega
el frontend.

Para desarrollo local, puedes copiar `.env.example` a `.env.local` y ajustar la
URL a tu backend local. No guardes credenciales ni secretos en variables `VITE_*`:
se incluyen en el bundle público del navegador.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
