# Swift Cards — Desafio de Mix & Performance

Jogo web em React + TypeScript + Vite, com temática inspirada no universo de proteína animal Swift.

## Rodar localmente

```bash
pnpm install
pnpm dev
```

## Build de produção

```bash
pnpm build
```

O build é criado em `dist/`.

## Publicar no GitHub Pages

O projeto já usa Vite. Para repositório em GitHub Pages, configure o `base` em `vite.config.ts` caso publique em uma subpasta (`/nome-do-repositorio/`).

## Estrutura

- `App.tsx` — fluxo e telas do jogo
- `data.ts` — cartas, especialistas, metas e progressão
- `logic.ts` — regras e pontuação
- `index.css` — identidade visual e animações
- `sounds.ts` — efeitos sonoros
- `Tutorial.tsx` — tutorial

## Observação de marca

Este projeto usa referências visuais e nominais da marca Swift. Garanta autorização de uso de marca, logotipo e ativos oficiais antes de publicação externa ou comercial.
