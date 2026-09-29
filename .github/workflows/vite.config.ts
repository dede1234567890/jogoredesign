import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Em GitHub Actions, publica automaticamente no caminho do repositório.
// Localmente e em outros hosts, usa raiz relativa simples.
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = process.env.GITHUB_ACTIONS && repositoryName ? `/${repositoryName}/` : './'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
