# Bora Ali Excursões — site

Site estático da **Bora Ali Excursões** (Salto/SP): agenda de excursões por categoria, filtro por mês, animações por destino e uma aba de reserva que manda o cadastro pronto para o WhatsApp.

Recursos da reserva:
- cadastro do contratante (com CEP que preenche o endereço sozinho e conferência de CPF), acompanhantes opcionais, contato de emergência e necessidades especiais;
- código de reserva (ex.: `BA-K3F9Q2`) na mensagem e na planilha;
- tela final com **Pix copia e cola** do sinal de 50%, já com o valor;
- rodízio das reservas entre os dois WhatsApps da agência;
- **opcional:** planilha Google que recebe as reservas, conta as vagas ("Restam X vagas", "Esgotado" e lista de espera), deixa editar a agenda e gera a lista de embarque.

Feito só com HTML, CSS e JavaScript, sem build e sem dependências. Pronto para a Vercel.

## Estrutura

```
index.html              página principal
404.html                página de "não encontrado"
vercel.json             configuração da Vercel (URLs limpas, cache, cabeçalhos)
_headers                mesma configuração, para o Cloudflare Pages
robots.txt
favicon.ico
apple-touch-icon.png
assets/
  css/style.css         estilos e animações
  js/data.js            AGENDA DE VIAGENS e configurações (é aqui que se edita)
  js/art.js             ilustrações animadas (SVG) de cada destino e categoria
  js/main.js            filtro, cards e aba de reserva
  img/                  logo, imagens de fundo e imagem de compartilhamento
google-apps-script/
  Codigo.gs             script da planilha de reservas
  LEIA-ME.md            como ligar a planilha ao site
```

## Como atualizar a agenda

Edite **`assets/js/data.js`**:

- **Nova viagem:** copie uma linha de `BORA_VIAGENS` e troque `data`, `dia`, `destino`, `categoria`, `valor`, `obs`, `selo`, `mes` e `cena`.
- **Novo mês:** acrescente em `BORA_MESES`, por exemplo `{ id: "mar", label: "Março" }`, e use `mes: "mar"` nas viagens.
- **Configurações em `BORA_CONFIG`:**
  - números de WhatsApp que recebem as reservas, parcelas máximas e cidades de embarque;
  - `pix.chave`: com ela preenchida, a tela final mostra o Pix copia e cola do sinal;
  - `planilhaUrl`: liga a planilha (veja `google-apps-script/LEIA-ME.md`);
  - `linkAvaliacao`: mostra "Avalie a gente no Google" no rodapé;
  - `avisoVagas`: a partir de quantas vagas restantes aparece o aviso "Restam X vagas".
- **Vagas:** preencha `vagas` em cada viagem (total de lugares). As vagas ocupadas são contadas pela planilha.

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

## Publicar no Cloudflare Pages (alternativa)

O site funciona igual no Cloudflare Pages: o arquivo `_headers` faz o papel do `vercel.json`, a `404.html` é usada sozinha e os links sem `.html` funcionam por padrão.

1. No painel da Cloudflare, abra **Workers & Pages › Create › Pages › Connect to Git** e escolha este repositório.
2. **Framework preset:** `None`. **Build command:** deixe vazio. **Build output directory:** `/`.
3. Clique em **Save and Deploy**. Cada `git push` na `main` publica de novo.
4. Para o domínio próprio, abra **Custom domains** no projeto e siga as instruções de DNS que aparecem.

## Modo demonstração

Abra o site com **`?demo=1`** no fim do endereço (ex.: `https://seusite.com.br/?demo=1`) para mostrar ao cliente as funções que dependem de dados reais: vagas e "Esgotado", Pix copia e cola e botão de avaliação, todos com dados fictícios. Nada é enviado para a planilha nesse modo, e quem abre o endereço normal não vê a demonstração.

Para mostrar como a agência recebe os cadastros, abra **`/demo/planilha`**: é uma página de apresentação com dados fictícios da planilha (reservas, lista de embarque e vagas). Ela não aparece no Google.

## Testar no computador

Na pasta do projeto:

```
python3 -m http.server 8000
```

e abra `http://localhost:8000`.
