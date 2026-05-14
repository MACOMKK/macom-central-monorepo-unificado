# Template de Novo App

Este template existe para acelerar a criacao de novos apps React/Vite no monorepo.

## Como usar

1. Copie `apps/_template` para `apps/<nome-do-app>`.
2. Ajuste:
   - `package.json`
   - `index.html`
   - `public/manifest.json`
   - `src/App.jsx`
3. Adicione scripts na raiz:

```json
"dev:<nome-do-app>": "vite --config apps/<nome-do-app>/vite.config.js --configLoader runner",
"build:<nome-do-app>": "vite build --config apps/<nome-do-app>/vite.config.js --configLoader runner"
```

4. Configure um projeto separado na Vercel com:
   - `Root Directory = /`
   - `Build Command = npm run build:<nome-do-app>`
   - `Output Directory = apps/<nome-do-app>/dist`
