# Bora Ali Excursões — site

Site estático da **Bora Ali Excursões** (Salto/SP): agenda de excursões por categoria, filtro por mês, animações por destino e uma aba de reserva que manda o cadastro pronto para o WhatsApp.

Feito só com HTML, CSS e JavaScript, sem build e sem dependências. Pronto para a Vercel.

## Estrutura

```
index.html              página principal
404.html                página de "não encontrado"
vercel.json             configuração da Vercel (URLs limpas, cache, cabeçalhos)
robots.txt
favicon.ico
apple-touch-icon.png
assets/
  css/style.css         estilos e animações
  js/data.js            AGENDA DE VIAGENS e configurações (é aqui que se edita)
  js/art.js             ilustrações animadas (SVG) de cada destino e categoria
  js/main.js            filtro, cards e aba de reserva
  img/                  logo, imagens de fundo e imagem de compartilhamento
```

## Como atualizar a agenda

Edite **`assets/js/data.js`**:

- **Nova viagem:** copie uma linha de `BORA_VIAGENS` e troque `data`, `dia`, `destino`, `categoria`, `valor`, `obs`, `selo`, `mes` e `cena`.
- **Novo mês:** acrescente em `BORA_MESES`, por exemplo `{ id: "mar", label: "Março" }`, e use `mes: "mar"` nas viagens.
- **WhatsApp que recebe as reservas, parcelas máximas e cidades de embarque:** ficam em `BORA_CONFIG`.

As categorias aceitas são `fds`, `praia`, `parques`, `natureza` e `passeios`. Em `cena`, use uma das chaves de `SCENES` em `assets/js/art.js`, ou `""` para uma cena genérica.

## Publicar na Vercel

1. Em [vercel.com](https://vercel.com), clique em **Add New… › Project** e importe este repositório.
2. **Framework Preset:** `Other`. Deixe Build Command e Output Directory vazios (a raiz já é o site).
3. Clique em **Deploy**. Cada `git push` na branch `main` publica de novo sozinho.

### Domínio próprio

1. No projeto da Vercel, abra **Settings › Domains** e adicione o domínio (ex.: `boraaliexcursoes.com.br` e `www.boraaliexcursoes.com.br`).
2. No registro do domínio (Registro.br, Hostinger etc.), crie os registros DNS que a Vercel mostrar. Normalmente:
   - domínio raiz: registro **A** apontando para `76.76.21.21`
   - `www`: registro **CNAME** apontando para `cname.vercel-dns.com`
3. Aguarde a propagação. A Vercel emite o HTTPS automaticamente.

Depois de ter o domínio, vale trocar no `index.html` o `og:image` para o endereço completo (ex.: `https://boraaliexcursoes.com.br/assets/img/og-image.jpg`), para a imagem aparecer certinho quando o link for compartilhado no WhatsApp.

## Testar no computador

Na pasta do projeto:

```
python3 -m http.server 8000
```

e abra `http://localhost:8000`.
