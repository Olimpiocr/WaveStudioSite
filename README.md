# Wave Studio · site

Site one-page da Wave Studio, feito em [Astro](https://astro.build) (HTML estático, sem framework no browser).

## Correr

```bash
npm install
npm run dev      # desenvolvimento com recarregamento: http://localhost:4321
npm start        # versão final + servidor com cabeçalhos de segurança: http://localhost:4321
```

`npm start` compila para `dist/` e serve com `server.mjs`, que aplica a mesma CSP, cache e compressão que vão ser usadas em produção. Para testar no telemóvel na mesma rede Wi-Fi, abrir `http://<IP-do-computador>:4321`.

## Onde mudar as coisas

| O quê | Ficheiro |
|---|---|
| Domínio, telefone, Instagram, Facebook, mensagens do WhatsApp | `src/consts.ts` |
| Textos de cada secção | `src/components/*.astro` |
| Cores, tamanhos, animações | `src/styles/global.css` |
| Formulário, menu e carrossel 3D | `src/scripts/main.ts` |
| Cabeçalhos de segurança em produção (Netlify) | `public/_headers` |

## WhatsApp

Os botões usam a API click-to-chat do WhatsApp (`https://wa.me/351936018970?text=…`), com uma mensagem pré-escrita diferente por origem. O formulário monta a mensagem com o nome, o negócio e os serviços escolhidos e abre o WhatsApp. Nada é guardado nem enviado para um servidor.

## Antes de publicar

- Trocar `SITE_URL` em `src/consts.ts` e o URL do sitemap em `public/robots.txt` pelo domínio final.
- Substituir `public/favicon.svg` pelo favicon oficial da marca.
- Publicar no Netlify: comando `npm run build`, pasta `dist`.
