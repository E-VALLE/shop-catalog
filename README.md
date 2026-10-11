# Shop Catalog

**Aplicação no ar:** <https://e-valle.github.io/shop-catalog/> · **Código:** <https://github.com/E-VALLE/shop-catalog>

Catálogo de produtos e carrinho simulado sobre a API pública [DummyJSON](https://dummyjson.com), com área pública de navegação e área administrativa protegida por login JWT.

**Tema escolhido:** Catálogo e compras (`/products`) — listagem com busca, paginação e filtro por categoria, detalhes, carrinho e administração de produtos.

> A DummyJSON **simula** escritas (POST/PUT/DELETE respondem com sucesso, mas não persistem). O admin aplica essas alterações localmente durante a sessão do navegador (`AdminStoreProvider`).

## Executar localmente

```bash
yarn install
yarn dev            # http://localhost:5173/shop-catalog/
yarn test:run       # Vitest + RTL
yarn test:coverage  # idem, com cobertura e limiares mínimos
yarn format:check   # Prettier (yarn format para corrigir)
yarn e2e            # Playwright com a API interceptada (faz build + preview na porta 4173)
yarn e2e:real       # smoke test contra a DummyJSON de verdade
E2E_BASE_URL=https://e-valle.github.io/shop-catalog/ yarn e2e   # a mesma suíte contra o site publicado (sem build local)
yarn build          # tsc -b && vite build
```

### Contas de demonstração

São contas **públicas** da DummyJSON (a tela de login também as mostra):

| Perfil | Usuário | Senha | O que vê |
| --- | --- | --- | --- |
| Administrador (`role: admin`) | `emilys` | `emilyspass` | Loja + área administrativa (`/admin`) |
| Cliente (`role: user`) | `averyp` | `averyppass` | Loja e checkout; `/admin` mostra "Acesso restrito" |

Não há cadastro de novos usuários: a DummyJSON não persiste dados (a conta criada em `POST /users/add` não consegue entrar). Ver "Pacote 10".

Rede com proxy/antivírus que impede `yarn playwright install`? Use um navegador já instalado:
`E2E_CHANNEL=msedge yarn e2e` (PowerShell: `$env:E2E_CHANNEL="msedge"; yarn e2e`).

## Rotas

| Rota | Acesso | Descrição |
| --- | --- | --- |
| `/` | público | Hero, categorias e destaques |
| `/produtos` | público | Busca (debounce), categoria e paginação sincronizadas com a URL |
| `/produtos/:id` | público | Detalhes e adicionar ao carrinho |
| `/carrinho` | público | Carrinho persistido em localStorage |
| `/favoritos`, `/comparar` | público | Favoritos (ids em `localStorage`) e comparação de até 3 produtos |
| `/checkout` | **logado** (qualquer papel) | Pagamento simulado em 3 etapas; sem itens no carrinho volta para `/carrinho` |
| `/login` | público | `POST /auth/login` + papel via `/auth/me`; ao vir de "Finalizar compra" volta para `/checkout` |
| `/admin`, `/admin/produtos`, `/admin/produtos/novo`, `/admin/produtos/:id/editar` | **somente `admin`** | Dashboard e CRUD (cliente vê "Acesso restrito") |

## Checklist dos 10 requisitos

1. **Componentes e TypeScript** — Vite + React + TS (`strict` explícito, sem `any`). Componentes funcionais com props tipadas e `children` (`src/components`, `src/layouts`, `src/pages`). Estilo via Mantine style props e tema (`src/theme/mantine-theme.ts`), sem CSS avulso.
2. **Estado, imutabilidade e ciclo de vida** — `useState` com spread/`map`/`filter` (carrinho, admin store). `useEffect` com deps precisas e cleanup: `useDebounce` (clearTimeout), `AuthProvider` (remove listeners `storage`/401 e o timer de expiração do JWT); os dados do servidor usam TanStack Query (`useApiQuery`), que cancela requisições via `AbortSignal`.
3. **Context API + hooks** — `AuthProvider`/`useAuth`, `CartProvider`/`useCart`, `AdminStoreProvider`/`useAdminStore`, além de `FavoritesProvider`, `CompareProvider`, `RecentlyViewedProvider` e `CurrencyProvider`; cada hook lança erro se usado fora do Provider (testado).
4. **Roteamento** — React Router com layouts aninhados e `<Outlet />` (`RootLayout`, `AuthLayout`), `NavLink` com rota ativa, `useNavigate` (pós-login), `useParams` (`/produtos/:id`), `ProtectedRoute` e 404.
5. **Mantine UI** — `MantineProvider` + tema, `AppShell` responsivo, `SimpleGrid`, `Card`, `Pagination`, `Table`, `LoadingOverlay`/`Loader`, `@mantine/form` (login e produto), `@mantine/modals` (confirmações), `@mantine/notifications`, ícones Tabler. Segue `anexos/ui-skill.md`.
6. **Autenticação JWT** — `POST /auth/login`; `accessToken` em `localStorage`, estado no `AuthContext`, `/admin/*` redireciona para `/login` (voltando ao destino original) e 401 derruba a sessão. Só o papel `admin` (lido de `/auth/me`) acessa `/admin/*`; clientes veem "Acesso restrito" (ver Pacote 10).
7. **API, interceptors e Zod** — `src/services/api.ts` (`baseURL` DummyJSON): interceptor de requisição injeta `Authorization: Bearer`; de resposta mostra notificação amigável (rede/erro) e dispara logout em 401. Schemas Zod em `src/schemas`, tipos via `z.infer`, respostas validadas com `safeParse` (`products-service.ts`) e formulários com `zod4Resolver` (Zod 4 exige `zod4Resolver`, não `zodResolver`).
8. **Vitest + RTL** — `yarn test:run`: **585 testes em 57 arquivos** (schemas com casos de borda, carrinho, debounce, `useAuth` e papéis, `ProtectedRoute`, Login, Produtos, checkout e pagamento, admin, serviços e interceptors, helpers puros). Cobertura 95,2% statements / 92,2% branches / 93,2% funções / 96,5% linhas, com limiares no CI. Consultas por `getByRole`/`getByLabelText`, `user-event`, wrapper `renderWithProviders` com contextos em memória (`MemoryRouter`).
9. **Playwright** — `e2e/auth.spec.ts` (bloqueio, redirecionamento pós-login, credencial inválida, logout) e `e2e/catalog.spec.ts` (busca → detalhes → carrinho, paginação, link direto e id inválido), além de papéis, checkout/pagamento, admin, PWA e acessibilidade (axe em claro e escuro): **143 testes** com a API interceptada, mais 1 smoke contra a API real e 10 de regressão visual (local). Localizadores semânticos, headless.
10. **CI/CD** — `.github/workflows/ci.yml` (push/PR: `yarn install --frozen-lockfile`, Prettier, tsc, lint, Vitest com cobertura, Playwright e um job `lighthouse`) e `deploy.yml` (build → `cp dist/index.html dist/404.html` → GitHub Pages). `base: '/shop-catalog/'` no `vite.config.ts` e `BrowserRouter basename`.

### Configuração no GitHub (feita)

1. Repositório **público** `E-VALLE/shop-catalog`.
2. _Settings → Pages → Source: GitHub Actions_ (o workflow `deploy.yml` publica a cada push na `main`).
3. _Settings → Rules → Rulesets_: ruleset **`proteger-main`** (ativo) na branch padrão, **sem lista de bypass**, com: _Require a pull request before merging_ (0 aprovações, pois há um só desenvolvedor), _Require status checks to pass_ com os jobs **`test`** e **`lighthouse`** (origem GitHub Actions; "Any source" foi removido para que só os jobs do nosso workflow liberem o merge) e _Block force pushes_ / _Restrict deletions_.

**Por que:** o deploy sai de cada push na `main`; com a regra, só entra código cujo CI passou, e todo ajuste fica registrado em um PR. Não marcamos "Require branches to be up to date" porque, com um único desenvolvedor, só obrigaria a retestar PRs sem ganho. Efeito prático: push direto na `main` é recusado e as mudanças seguem **branch → PR → CI verde → merge**.

## Idiomas (pt-BR / en)

- **Detecção no primeiro acesso** (`src/i18n/detect-language.ts`, sem serviço externo nem envio de IP): escolha salva > idioma preferido do navegador (`pt*` → Português-BR, demais → Inglês) > fuso horário brasileiro quando o navegador não informa idioma > inglês.
- **Seletor** (badge PT-BR / EN no cabeçalho e na tela de login): troca todo o texto da interface, persiste em `localStorage` e atualiza `<html lang>`. Implementado com `react-i18next`; dicionários em `src/i18n/locales` (um teste garante as mesmas chaves em ambos).
- Mensagens de validação do Zod são chaves de tradução; preços usam `Intl.NumberFormat` no idioma ativo (em R$ ou US$, conforme a moeda; ver "Moeda e cotação").
- **Categorias** são traduzidas pelo slug (`categories.*` nos dicionários; slug desconhecido vira um título gerado) em home, filtros, cards, detalhes, admin e formulário.
- **Limitação:** títulos, descrições e marcas dos produtos vêm da DummyJSON em inglês e não são traduzidos (a busca por texto também é em inglês).

## Moeda e cotação (pt-BR)

Em pt-BR os preços aparecem em **R$**: valor em USD × cotação do dia. Em inglês permanecem em USD. A conversão é só de exibição (carrinho e API continuam em USD) e a compra é simulada.

- Fonte: [AwesomeAPI](https://economia.awesomeapi.com.br/json/last/USD-BRL) (`bid`), com [Frankfurter](https://api.frankfurter.dev) (BCE) como reserva; respostas validadas com Zod (`src/services/exchange-service.ts`, cliente Axios próprio, sem o JWT).
- Cache de 12 h em `localStorage` (`shop-catalog:fx`); se a API falhar usa a última cotação salva e, sem nenhuma, exibe USD com aviso. A cotação usada aparece no rodapé.
- `CurrencyProvider` / `useCurrency` / `useFormatPrice`.

## Avatar

O avatar do operador mostra as **iniciais** (ex.: "EJ") com cor estável por usuário (`Avatar name color="initials"` do Mantine). A imagem da DummyJSON é só um identicon gerado e deixou de ser usada.

## Checkout

"Finalizar compra" leva à página `/checkout` (pagamento simulado em três etapas; ver "Pacote 11"). Sem sessão, o botão leva ao login (`state: { from: "/checkout", checkout: true }`); o carrinho vive no `CartProvider` e em `localStorage`, então nada se perde, e depois de entrar o usuário volta direto ao checkout (`useCheckout`).

## Navegação por categoria e marca

Melhoria de descoberta sugerida durante o uso: a partir do produto o usuário continua explorando sem voltar ao catálogo e refazer filtros.

- **Detalhes e cards:** o selo da categoria é um link para `/produtos?categoria=<slug>`; o selo da marca leva a `/produtos?categoria=<slug>&marca=<marca>` (marca **dentro da categoria**). Os links têm `aria-label` descritivo ("Ver produtos da marca Knoll em Móveis"). O detalhe também ganhou **breadcrumb** (Produtos › Categoria › produto) em `<nav aria-label>`.
- **Catálogo:** `?marca=` é lido pela URL (como `categoria`, `q` e `pagina`), então o filtro é compartilhável e sobrevive ao recarregar. Um chip "Marca: X ✕" mostra o filtro ativo e permite removê-lo; se a combinação categoria + marca não tiver resultados, aparece "Ver todos os produtos da marca X".
- **Por que o filtro de marca é no cliente:** a DummyJSON não tem filtro por marca e a busca de texto é imprecisa (casa com título e descrição: "Apple" traria frutas). Para esses casos `listProducts` busca o escopo inteiro (`limit=0`, ~200 itens), filtra com comparação **exata e sem diferenciar maiúsculas** e pagina localmente, devolvendo o `total` real. O mesmo caminho corrigiu um defeito antigo: **busca + categoria** filtrava só a página corrente.
- **Limitações conhecidas:** só 102 dos 194 produtos têm marca (sem marca, sem atalho) e várias marcas têm um único produto, então o resultado pode ser 1 item.
- **Acessibilidade:** o botão de remover do `Pill` do Mantine é `aria-hidden` (foi feito para `PillsInput`), por isso o chip usa `Badge` + `CloseButton` com `aria-label` — descoberto pelos testes.
- **Imagem do card clicável:** a imagem do produto navega para `/produtos/:id`, o mesmo destino do botão "Detalhes" (é um `Link` que envolve a imagem). Para não duplicar o mesmo link para quem usa teclado ou leitor de tela, o atalho da imagem fica fora da ordem de tabulação (`tabIndex={-1}`) e `aria-hidden`; o botão "Detalhes" continua sendo o alvo acessível, e a imagem passou a ter `alt=""` por ser decorativa nesse contexto (o título do produto já nomeia o `article`).
- **Carrinho:** a miniatura do item segue o mesmo padrão (atalho `aria-hidden`, fora do `Tab`) e o **título do item virou o link acessível** para os detalhes, assim quem está no carrinho pode rever o produto sem perder os itens (o carrinho persiste em `localStorage`).
- Helper `catalogUrl()` (`helpers/urls.ts`) centraliza a montagem dessas URLs.

## Polimento de UX (pacote 1)

| Melhoria | Como | Por quê |
| --- | --- | --- |
| **Skeletons** em catálogo, Home e detalhes (`components/product-skeleton.tsx`) | Cards-fantasma com a mesma estrutura e altura do `ProductCard`; o contêiner é `role="status"` + `aria-busy` + rótulo ("Carregando produtos...") | Evita o salto de layout (CLS) quando os dados chegam e passa sensação de velocidade; leitores de tela são avisados do carregamento. |
| **`loading="lazy"` + `decoding="async"`** nas imagens dos cards | Atributos nativos do `<img>` | Hoje 12 imagens eram baixadas de uma vez; imagens fora da tela só carregam ao se aproximar. |
| **Voltar ao topo e focar o título ao paginar** (`useScrollOnChange`) | Na mudança de página: `scrollTo` (suave) e foco no `<h1>` (`tabIndex={-1}`); respeita `prefers-reduced-motion`; não age na 1ª renderização | O usuário ficava no rodapé da lista; o foco evita que teclado/leitor de tela permaneça no botão da paginação com conteúdo trocado. |
| **Nova rota abre no topo** (`useScrollToTop`, no `RootLayout`) | Ao mudar de rota (`pathname`), `window.scrollTo(0, 0)`; não age na 1ª renderização, em voltar/avançar (o navegador restaura a posição) nem quando só a busca/filtro/página muda na mesma rota | O React Router (modo declarativo) não restaura a rolagem: no celular, "Detalhes" a partir de uma lista rolada abria a página nova no meio (Avaliações/Relacionados). Achado no site publicado; teste e2e `scroll-reset.spec.ts` (celular e desktop) e unitário do hook. |
| **Título da aba por rota** (`useDocumentTitle`) | "Móveis · Produtos · Shop Catalog", nome do produto nos detalhes, "Carrinho", etc.; acompanha a troca de idioma | Identifica abas abertas e histórico, anuncia a navegação a leitores de tela e melhora o compartilhamento. |

Testes: unitários dos hooks (inclui `prefers-reduced-motion`, primeira renderização e valores repetidos), das páginas (skeleton, título, rolagem/foco) e e2e `ux-polish.spec.ts` (título por rota/idioma, skeleton com resposta atrasada, rolagem real ao paginar, `loading="lazy"`).

## Pacote 2: ordenação, desconto e estoque

| Melhoria | Como | Por quê |
| --- | --- | --- |
| **Ordenar por** (menor/maior preço, melhor avaliação, nome A–Z) | `?ordem=` na URL (`helpers/sorting.ts`), validado com `parseSort`: valor desconhecido vira "relevância". Trocar a ordem volta para a página 1 | Esperado em qualquer catálogo; URL compartilhável e compatível com o botão voltar. |
| **Preço ordenado pelo valor COM desconto, no cliente** | A API ordena pelo preço de tabela, mas a tela mostra o preço com desconto — a lista parecia fora de ordem (R$ 3,70 · 5,11 · 4,38). Por isso, ordenações de preço buscam o escopo todo (`limit=0`, cacheado) e ordenam localmente; avaliação e nome usam `sortBy`/`order` da API | O que o usuário vê precisa estar em ordem; foi um defeito achado na revisão visual. |
| **Selo de desconto** ("-15%") sobre a imagem do card e ao lado do preço nos detalhes | `discountPercent()`: arredonda, ignora < 1% e nunca mostra "-100%"; `aria-label` "15% de desconto" | O preço riscado sozinho passa despercebido. |
| **Aviso de estoque** | `stockStatus()`: ≤ 5 unidades → "Restam N" (card) / "Restam apenas N unidades" (detalhes); 0 → "Esgotado" e **botões de compra desabilitados** (o link Detalhes continua ativo) | Gera urgência honesta e evita adicionar ao carrinho item indisponível. |

## Pacote 3: galeria e favoritos

- **Galeria** (`components/product-gallery.tsx`): a API já traz `images`; os detalhes mostram a imagem principal e miniaturas (`aria-pressed`, rótulo "Ver imagem 2 de 3"), sem miniaturas quando há uma só foto e sem repetir imagens.
- **Favoritos** (`FavoritesProvider`/`useFavorites`, página `/favoritos`): coração nos cards e nos detalhes (botão de alternância com `aria-pressed` e rótulo que cita o produto), contador no cabeçalho e item no menu móvel (abaixo de `xs` o ícone sai do cabeçalho por falta de espaço).
  - Guardamos **só os ids** em `localStorage` (validados com Zod; lixo/duplicados são descartados); a página busca o catálogo (mesmo cache do dashboard) e mostra do mais recente para o mais antigo. Ids que a API não conhece são ignorados; sem nenhum válido, aparece o estado vazio.
  - Sincroniza entre abas pelo evento `storage`.

Testes: unitários (ordenação, `parseSort`, estoque, desconto, serviço, provider de favoritos, galeria, botão, páginas) e e2e (`sorting-badges`, `favorites-gallery`).

## Pacote 4: carrinho, Home e acessibilidade

| Melhoria | Como | Por quê |
| --- | --- | --- |
| **Desfazer** ao remover item ou esvaziar o carrinho | `useCartUndo` + `CartProvider.restoreItems`: a notificação (8 s) tem o botão "Desfazer", que devolve os itens **às posições originais** (se o produto já voltou ao carrinho, soma a quantidade em vez de duplicar) | Remoção/esvaziamento por clique errado é a queixa mais comum; confirmar antes atrapalha o fluxo, desfazer não. |
| **Carrinho em telas estreitas** | O bloco quantidade/total/remover quebra para a linha de baixo (`Group` com `flex-basis`); verificado sem rolagem horizontal em 320 px | A linha única com 5 elementos estourava no celular. |
| **Home: ver todas as categorias** | Mostra 12 e um botão de alternância (`aria-expanded`) com a contagem; some quando há 12 ou menos | Antes as demais categorias eram inalcançáveis pela Home. |
| **Link "Pular para o conteúdo"** + alvo `<main id="main-content">` | Primeiro item do `Tab`, fica fora da tela até receber foco; não altera a URL | WCAG 2.4.1: quem usa teclado não precisa atravessar o cabeçalho a cada página. |

**Notificação de remoção em destaque.** A mensagem "… removido do carrinho" tem fundo âmbar (diferente do branco/escuro da página e do azul da marca) e a frase de ação em negrito e cor própria; o botão "Desfazer" é neutro (`variant="default"`) para contrastar nos dois temas. As cores vêm de `theme/notification-styles.ts` com `light-dark()` (escolhe pelo tema ativo, sem CSS à parte). A frase é montada em pedaços (produto + frase traduzida com plural: "removido/removidos do carrinho", "removed from the cart"), não com HTML dentro da tradução, para que um título de produto com `<` nunca seja interpretado como marcação. O e2e `removal-notification.spec.ts` confere, em claro/escuro × pt-BR/en, que o fundo difere da página, que a frase está em negrito e com cor própria, e que o axe não aponta contraste. Achado no caminho: o `red.8` do Mantine 9 é `#e03131` (4,15:1 sobre o âmbar); a frase usa `red.9`.

### Auditoria de acessibilidade automatizada (axe)

`e2e/a11y.spec.ts` roda o **axe-core** (WCAG 2.1 A/AA) em Home, catálogo, detalhes, carrinho, favoritos, login, admin, em inglês e no **tema escuro**; qualquer violação reprova o CI. A primeira execução achou problemas reais, corrigidos:

| Achado (axe) | Correção |
| --- | --- |
| **Contraste** do texto branco nos botões azuis: 3,5:1 (< 4,5:1) | `primaryShade: 8` (≈5:1) em `src/theme/mantine-theme.ts`. É uma **divergência consciente** do `anexos/mantine-theme.ts` (que usa 6), registrada aqui. |
| Texto secundário (`c="dimmed"`) com 3,3:1 no claro e 3,5–4,0:1 no escuro | Variável CSS `--mantine-color-dimmed` redefinida por esquema (`theme/css-variables.ts`): gray.7 no claro, dark.1 no escuro. |
| Selos de desconto/estoque/esgotado e avatar com contraste 2,6–3,6:1 | Tons mais escuros (`red.8`, `gray.7`), texto escuro sobre laranja claro e `luminanceThreshold: 0.179` para o `autoContrast` (ponto ótimo entre texto branco e preto). |
| Texto de estoque baixo em laranja (3,0:1) e vermelho no escuro (3,4:1) | `red.8` no claro, `red.4` no escuro. |
| **`button-name` (crítico)**: setas da paginação e o "X" das notificações sem nome | `getControlProps` com `aria-label` traduzido na paginação; `closeButtonProps` padrão no tema (getter, acompanha o idioma). |

Limite conhecido: o axe cobre só o que é detectável automaticamente (~30–40% dos problemas de acessibilidade); leitura por leitor de tela e testes manuais continuam necessários.

## Dashboard: gráficos

- **Produtos por categoria (top 10)**, em barras horizontais, e **Situação do estoque** (em estoque / poucas unidades ≤ 5 / esgotado), em rosca — `@mantine/charts` (Recharts). Os dados vêm do mesmo catálogo em cache dos indicadores e já refletem as alterações simuladas do admin.
- **Acessibilidade:** o gráfico é SVG e leitores de tela não o leem; por isso cada um tem `role="img"` com um `aria-label` que lista os números, o rótulo do eixo mostra a contagem ("Mercearia · 32") e a rosca tem legenda em texto — a informação nunca depende só de cor. O axe passa nos temas claro e escuro.
- O indicador "Estoque baixo (≤5)" usa o mesmo critério do gráfico (poucas unidades + esgotado); antes usava "< 10", o que divergia do selo "Restam N" dos cards.
- **Custo:** o Recharts pesa ~120 kB gzip, mas só entra no chunk do dashboard (rota carregada sob demanda); o catálogo público não paga por ele.
- Testes: unitários das estatísticas (empates, limites 0/5, estoque desconhecido) e da página; e2e confere que as barras e a rosca são **desenhadas de fato** (elementos SVG), a legenda, o idioma e o axe.

## Galeria de imagens: por que algumas páginas não têm miniaturas

As miniaturas só aparecem quando o produto tem **mais de uma foto**. Na DummyJSON isso é a minoria: 78 dos 194 produtos (40%) têm uma única imagem — por exemplo, a "Eyeshadow Palette with Mirror" (id 2) — e a galeria sem alternativas não mostra uma fileira de uma miniatura só. O campo `thumbnail` não conta como foto extra: é a mesma imagem em tamanho reduzido. Produtos com várias fotos (ex.: id 14, com 3) exibem as miniaturas normalmente; há teste cobrindo os dois casos.

## Robustez e qualidade (backlog de código)

| Item | O que foi feito | Por quê |
| --- | --- | --- |
| **Expiração do JWT no cliente** (`lib/jwt.ts`, `AuthProvider`) | Lê o `exp` do token (sem verificar assinatura): sessão salva já vencida é descartada na abertura e, com a sessão ativa, um timer (com cleanup) desloga no prazo, avisando "Sua sessão expirou". Token sem `exp` legível (ex.: opaco) é mantido — o servidor decide via 401 | Evita a tela "logada" com um token que já não vale até o primeiro 401. O cliente só antecipa; **a validação real é sempre do servidor**. |
| **Dados externos validados com Zod, sem `as`** | Usuário salvo, cache de cotação, `location.state` e corpo de erro da API passam por `safeParse` (`schemas/session-schema.ts`). Dado inválido é descartado em vez de quebrar o app | `JSON.parse(...) as X` mente para o compilador: localStorage e URL são entradas não confiáveis. |
| **Sem redirecionamento aberto** | O destino pós-login (`from`) só é aceito se for caminho interno (`/x`); `//host`, `https://…` e `javascript:` são rejeitados (testado) | Evita usar o login como trampolim para sites externos. |
| **Chaves do i18n tipadas** (`i18n/i18next.d.ts`) | `t("cart.titulo")` virou erro de compilação; o dicionário pt-BR é a fonte dos tipos e o teste de paridade garante o inglês | Erro de digitação em texto de UI aparecia só em execução. |
| **Imagem de reserva** (`theme/image-placeholder.ts`) | `Image` tem `fallbackSrc` padrão no tema (SVG em data URI, sem rede): produto sem foto ou imagem quebrada mostra um ícone, não um quadro vazio | Cobre produtos criados no admin (enviam sem `thumbnail`) e falhas de CDN. |
| **Prettier**, `.nvmrc` (Node 22), `engines`, **cobertura com limiares**, **Dependabot** | `yarn format:check` e `yarn test:coverage` rodam no CI; limiares (stmts 90 / branches 85 / funcs 88 / lines 92, ver "Pacote 9") ficam logo abaixo do medido; Dependabot semanal (npm agrupado + GitHub Actions) | Padroniza o código, impede regressão de cobertura e mantém dependências atualizadas com PRs pequenos. |
| **Testes que faltavam** | `ProductForm`, `AdminProducts` (listar, excluir com confirmação, cancelar, erro da API, produtos locais), interceptors de `api.ts` (Bearer, 401, login, rede, 5xx), JWT, schemas, expiração da sessão (timers falsos) | Eram as áreas sem teste apontadas na revisão. |

Correções que os testes novos revelaram:

- **Campos numéricos do formulário de produto**: começavam em `0.00` e digitar "10" não dava 10. Agora começam vazios (com mensagem "Informe o preço/estoque") e a validação distingue vazio de zero.
- O `NumberInput` devolve texto (`"10.00"`) enquanto há casas decimais fixas; o equivalente em reais agora normaliza para número.
- Timeout padrão de 5 s do Vitest era curto sob cobertura (consultas por role no jsdom são lentas); subiu para 20 s e os testes de digitação usam `user-event` sem pausa entre teclas.

## Identidade visual: superfícies e acentos de cor

As cores ficam em `src/theme/surfaces.ts` e usam `light-dark()` do CSS (o Mantine define o esquema ativo), então o mesmo valor serve ao tema claro e ao escuro, sem arquivos .css. Todas as combinações texto/fundo passam no axe nos dois temas.

| Área | Decisão | Por quê |
| --- | --- | --- |
| **Cabeçalho fixo** | Fundo azul muito suave (≈7% de azul sobre branco; no escuro, azul-escuro misturado a `dark-7`) e borda no mesmo tom | Separa o cabeçalho do conteúdo sem competir com ele; o tom é leve de propósito, porque o texto azul dos botões precisa manter contraste ≥ 4,5:1. |
| **Favoritos × carrinho** | Favoritos em **rosa** (ícone, hover e contador `pink.8`); carrinho continua **azul** | Duas ações diferentes não podem ter a mesma cor de hover/contador; rosa remete a "coração" e não confunde com o azul da marca. |
| **Moldura da imagem (detalhes)** | No claro, cinza muito claro (`default-hover`); no escuro, `dark-6` (como já era) | A foto do produto deixa de "flutuar" sobre o branco da página. |
| **Hero da Home** | Degradê diagonal (neutro/claro à esquerda, onde está o texto → azul à direita; no escuro, azul-petróleo → roxo) com ilustração SVG decorativa (sacola, círculos concêntricos e grade de pontos) que desvanece em direção ao texto (`mask-image`) | Dá profundidade e identidade de loja sem usar imagem pesada: é SVG inline com `currentColor` (acompanha o tema), `aria-hidden`, não captura cliques e some em telas < `sm`. O texto fica na zona de contraste alto. |
| **Dashboard** | Painéis (indicadores, gráficos e ações rápidas) com fundo azulado suave | Destaca os blocos do fundo da página, claro e escuro. |

Testes: `e2e/visual-surfaces.spec.ts` confere, em claro e escuro, que cabeçalho, moldura da imagem, hero e **todos** os painéis do dashboard têm fundo diferente do da página, que ícone, contador e hover de favoritos diferem do carrinho, que o hero tem degradê e arte `aria-hidden`, e que a arte some no celular.

### Achado de acessibilidade: menu móvel acessível por teclado no desktop

Ao testar o cabeçalho, o `Tab` passava por 4 links do **menu móvel** invisível (o Mantine só o desloca para fora da tela). Corrigido: o menu agora é `display: none` a partir de `md` (antes `sm`; ver "Cabeçalho em uma linha" abaixo) e, no celular, fica `inert` enquanto fechado (some do foco e dos leitores de tela). Há e2e nos dois casos.

### Cabeçalho em uma linha (admin logado)

**Problema:** com o admin logado o cabeçalho tem mais itens (4 links + idioma, moeda, tema, favoritos, carrinho, avatar). Entre ~800 e ~1100 px os grupos quebravam para a linha de baixo e desconfiguravam a página.

**Correção e motivos:**

| Mudança | Motivo |
| --- | --- |
| Grupo externo com `wrap="nowrap"` | O padrão do `Group` é quebrar linha; no cabeçalho de altura fixa (64 px) isso empurra os itens para fora dele. |
| Menu móvel (hambúrguer) passa a valer até `md` (992 px), antes `sm` | Entre 768 e 991 px a navegação completa não cabe ao lado dos controles; o menu móvel já existia e comporta tudo. |
| Ícones dos links de navegação só a partir de `xl` (1408 px) | Economiza ~110 px onde o espaço é mais apertado (1100–1400 px); o texto basta para identificar o link. |
| Espaçamento entre links reduzido (`gap` 4) | Ganho de largura sem perder área de clique (botões mantêm `size="sm"`). |

Teste: `e2e/header-layout.spec.ts` entra como admin em 800, 992, 1100, 1280 e 1365 px, em pt-BR e en, e confere que todo item visível do cabeçalho fica dentro da faixa de 64 px e da janela, sem rolagem horizontal.

## Pacote 5: Home, cartão, moeda e histórico

| Melhoria | Como | Por quê |
| --- | --- | --- |
| **Quantidade no cartão** | `CardCartControl`: "Comprar" vira `− N +` (limitado ao estoque, `+` desabilitado no máximo); diminuir de 1 remove com "Desfazer" | Evita repetir "Comprar" e ir ao carrinho só para ajustar a quantidade. |
| **Faixa de benefícios** (`TrustStrip`) | Frete grátis (acima de US$ 50, convertido para a moeda ativa), devolução em 30 dias e pagamento seguro (deixa claro que é demonstração) | Conteúdo de confiança padrão em lojas; reaproveita as regras de `helpers/pricing.ts`. |
| **Em promoção** | `listTopDiscounts`: a API ordena por `discountPercentage` (`sortBy` aceita qualquer campo), então só 4 itens trafegam | Barato e mostra a maior economia logo na Home. |
| **Moeda manual** (`CurrencySwitcher`) | Preferência `auto` (segue o idioma) / `BRL` / `USD` em `localStorage`; vale mesmo em inglês e busca a cotação quando precisa | Quem usa o site em pt-BR podia não conseguir ver em dólar (e vice-versa). No celular o seletor vai para o menu. |
| **Vistos recentemente** | `RecentlyViewedProvider` (até 8 ids, dedupe, mais recente primeiro, validado com Zod) na Home e nos detalhes, sem repetir o produto atual | Retomar a navegação; usa o catálogo em cache, sem requisição extra. |

## Pacote 6: comparar, filtros, avaliações, resumo do pedido e lista

| Melhoria | Como | Por quê |
| --- | --- | --- |
| **Comparar produtos** (`/comparar`) | Botão de balança nos cartões (`aria-pressed`), até 3 produtos (`CompareProvider`), barra fixa com a contagem e tabela lado a lado; os melhores valores (menor preço, melhor avaliação, maior estoque) vêm **em texto**, não só em cor | Decisão de compra entre alternativas parecidas; a limitação a 3 mantém a tabela legível. |
| **Filtros avançados** | Faixa de preço, avaliação mínima e "somente em estoque", na URL (`precoMin`, `precoMax`, `nota`, `estoque`) com valores inválidos ignorados; filtro sobre o **preço com desconto**; painel recolhível com contador no botão. A faixa de preço usa **escala cúbica** (`sliderToPrice`) | A API não filtra por esses campos (filtro no cliente, como marca/ordenação). O catálogo vai de US$ 1 a ~US$ 32 mil: numa escala linear o começo da faixa seria impossível de ajustar (achado na revisão visual). |
| **Avaliações e relacionados** | `ProductReviews` (média, 3 primeiras + "ver todas", datas no idioma ativo, estrelas decorativas com nota em texto) e `RelatedProducts` (mesma categoria, mesma marca primeiro) | A API já traz `reviews`; prova social e descoberta nos detalhes. |
| **Painel do formulário de produto** | O `Card` de `/admin/produtos/novo` (e de edição) usa `PANEL_BG`, o mesmo azul suave dos painéis do dashboard | Coerência da área administrativa; os campos brancos ganham contraste contra o painel. Teste: `e2e/form-surface.spec.ts` (fundo ≠ página e axe em claro/escuro). |
| **Duas notas, dois rótulos** | Topo dos detalhes: `rating` do produto, rotulada "nota geral do catálogo". Seção de avaliações: média calculada só sobre o array `reviews` ("Média das N avaliações de clientes") | São dados diferentes da DummyJSON: `rating` é um campo pré-calculado do catálogo (ex.: 3,3) e `reviews` traz poucos comentários de amostra (ex.: 3,0). Não há como reconciliá-los; sem rótulo, pareciam um erro. |
| **Resumo do pedido** | Subtotal de tabela, descontos dos produtos, **cupom** (`BEMVINDO10`, demonstração, sem diferenciar maiúsculas, persistido), frete (grátis a partir de US$ 50 **após o cupom**) com barra de progresso e total; o total aparece na confirmação da compra e o cupom é consumido | Transparência de preço; cálculo puro em `computeOrderSummary` (centavos arredondados, limites inclusivos, itens antigos sem `listPrice` sem "desconto fantasma"). |
| **Grade × lista** | `ViewToggle` (`?vista=`, com a última escolha lembrada; a URL manda) e `ProductListItem` com descrição, marca e ações; empilha em telas estreitas | Lista detalhada ajuda a ler descrições e comparar em telas grandes. |

Testes: unitários (providers, helpers puros, componentes e páginas) e e2e `batch-a.spec.ts` / `batch-b.spec.ts`, incluindo auditoria **axe** (claro e escuro) das telas novas — que pegou o contraste de selos `teal.8` (3,9:1) trocados por `teal.9`.

## Pacote 7: dashboard interativo e administração

| Melhoria | Como | Por quê |
| --- | --- | --- |
| **Painéis clicáveis (drill-down)** | Cada indicador do Dashboard é um `<button>` (`aria-haspopup="dialog"`, rótulo "valor. Ver lista") que abre um `DrillDownModal`: **Estoque baixo** lista os produtos a repor (esgotados primeiro), **Categorias** lista as categorias e, ao escolher uma, os produtos dela, **Preço médio** mostra os mais caros e os mais baratos, **Produtos** lista todos. Cada linha leva ao detalhe e ao formulário de edição | Do número ao item acionável: quem vê "2 com estoque baixo" precisa saber *quais* são. Reaproveita o catálogo já carregado (sem nova requisição). |
| **Gráficos clicáveis** | Legendas do gráfico "Situação do estoque" (`Poucas unidades`, `Esgotado`, `Em estoque`) são botões; clicar numa barra de categoria abre os produtos dela. O clique da barra é validado com Zod (`barClickSchema`), pois o Recharts entrega um objeto sem tipo | Mesma regra do indicador (poucas + esgotado = estoque baixo) em um só helper, `helpers/dashboard-stats.ts`; legendas continuam em texto (não dependem só de cor). |
| **Gráfico de linha** | Preço médio por categoria (`LineChart`), com `role="img"` e descrição em texto de todos os pontos | Terceira visão dos dados; a descrição textual mantém o gráfico acessível. |
| **Tabela do admin ordenável** | Cabeçalhos `SortableTh` (botão + `aria-sort`), ordenação por nome, preço, estoque e categoria, na URL (`?ordem=`) | Compartilhável, e o leitor de tela anuncia a ordem. Preço ordena pelo valor **com desconto**. |
| **Seleção em lote** | Caixas de seleção por linha e "selecionar a página"; a seleção é descartada ao mudar página, categoria, ordem ou busca; exclusão em lote com confirmação e **Desfazer** | Evita excluir itens que o usuário já não vê. |
| **Edição no lugar** | `EditableCell` para preço e estoque (Enter salva, Esc cancela, validação com mensagem) | Ajustes rápidos sem abrir o formulário completo. A API só simula a escrita, então a edição vale para a sessão (`AdminStoreProvider`). |
| **Exportar CSV** | `helpers/csv.ts`: BOM + CRLF (Excel abre acentos), `;` e vírgula decimal em pt-BR, `,` e ponto em en; inclui as edições da sessão | Excel em português espera `;`. **Segurança:** células que começam com `=`, `+`, `-`, `@` ganham um apóstrofo (*CSV/formula injection*). |

**Bugs achados e corrigidos nesta etapa**
- **"Desfazer" não restaurava produtos locais** (função guardada na notificação lia estado antigo): `AdminStoreProvider` passou a um único estado atualizado de forma funcional, com teste que guarda as funções *antes* da exclusão.
- **Botão de fechar o modal sem nome acessível** (axe, crítico): `closeButtonProps` no tema, com `aria-label` traduzido.
- **CLS da Home** ao carregar as categorias: ver Pacote 8.

## Pacote 8: PWA, Lighthouse e regressão visual

| Melhoria | Como | Por quê |
| --- | --- | --- |
| **PWA básico** | `vite-plugin-pwa` (`generateSW`): manifesto (`display: standalone`, `scope`/`start_url` = `/shop-catalog/`, ícones 192/512 + *maskable*), `theme-color`, `apple-touch-icon` e *service worker* registrado em `main.tsx` com `autoUpdate`. Ícones gerados de `public/icon.svg` por `scripts/make-icons.mjs`. O ícone da aba (`public/favicon.svg`, referenciado em `index.html`) era o raio do template do Vite e passou a ser o mesmo carrinho do app, em um quadrado arredondado; teste em `e2e/pwa.spec.ts` | Instalável e abre offline. O escopo precisa ser o `base` do GitHub Pages, senão o navegador recusa o worker. |
| **Cache offline** | Pré-cache do *shell* (JS/CSS/HTML), `navigateFallback` para `index.html` (as rotas do SPA abrem offline), `StaleWhileRevalidate` para o catálogo (24 h) e fontes, `CacheFirst` para imagens (7 dias). **`/auth` nunca é cacheado** | O que já foi visto continua disponível sem rede; token e login jamais ficam em cache. Carrinho/favoritos já estão em `localStorage`. |
| **E2E do PWA** | `e2e/pwa.spec.ts`: manifesto e ícones, worker assume a página e a Home recarrega **offline**. Nos demais specs `serviceWorkers: "block"` | O worker ignoraria os mocks de `page.route`. |
| **Lighthouse no CI** | Job `lighthouse` (`@lhci/cli`, `lighthouserc.json`) audita Home e Produtos no build de produção: **acessibilidade ≥ 0,9** e **desempenho ≥ 0,3** falham o job; melhores práticas, SEO e CLS ≤ 0,1 apenas avisam; relatório anexado | Barra regressões de acessibilidade e de peso. |
| **Regressão visual** | `yarn e2e:visual` (projeto `visual`): 5 telas (início, produtos, carrinho vazio, entrar e checkout) × claro/escuro com `toHaveScreenshot`; `yarn e2e:visual:update` atualiza as bases após mudança intencional | Pega o que o DOM não mostra (cor, espaçamento, tema). **Fora do CI** de propósito: as imagens base dependem de SO/fontes (`*-win32.png`); gerar no Linux exigiria rodar o *update* no próprio CI. |

**Achado do Lighthouse e o que foi feito:** a primeira medição trouxe CLS **0,21** na Home (a lista de categorias "empurrava" o conteúdo ao chegar) — corrigido reservando o espaço com `Skeleton` (agora 0,02) — e a fonte do Google bloqueava a renderização — agora carrega com `media="print"` + `onload` (e `<noscript>`).

**Desempenho: gap conhecido.** A nota local fica em ~0,4 (FCP ~4,3 s, TBT ~1,3 s) sob o perfil móvel padrão do Lighthouse (4G lenta, CPU 4× mais lenta): o *bundle* principal (~600 kB) e o CSS do Mantine (~250 kB) dominam. Por isso o piso do CI é 0,3 (anti-regressão) e a **meta é 0,7**. **Investigação (code-splitting):** o `recharts` já ficava isolado no chunk do Dashboard (rota *lazy*, ~460 kB) e não pesa na Home. O *bundle* principal é framework: `react-dom` (~612 kB de fonte), `@mantine/core` (~385), `@floating-ui` (~245), `axios` (~166), `@tanstack/query-core` (~111) e `react-router` (~94). Nada disso se divide por rota, então separar mais não muda a primeira carga. O único ganho seguro foi mover o CSS dos gráficos (`@mantine/charts/styles.css`, ~14 kB) para o chunk do Dashboard; a nota não mudou de forma mensurável (0,36–0,40, dentro do ruído). Não podamos o CSS do Mantine (~235 kB, ~34 kB gzip) porque o risco visual supera o ganho: o custo dominante é *parse*/execução de JS (TBT ~1,6 s). Próximos passos realistas, se a meta 0,7 for exigida: trocar `axios` por `fetch` (~35 kB min.), carregar `@mantine/modals`/notificações sob demanda e pré-carregar a fonte.

## Pacote 9: revisão final de qualidade e desempenho

Antes de publicar, rodamos a bateria completa e implementamos as sugestões da revisão. Decisões e motivos:

| Item | O que foi feito | Motivo |
| --- | --- | --- |
| **Dependências sem uso** | Removidos `@mantine/dates` e `dayjs` | Nenhum arquivo os importava; menos instalação e menos superfície de atualização. |
| **Cobertura de testes** | Novos testes para `root-layout`, `product-form-page`, `not-found`, `auth-service`, leituras/escritas de `products-service` e as ordenações do admin (`sorting.ts`). Cobertura: linhas 96,7%, funções 93,6%, branches 93,0% (antes 89,9 / 89,2 / 83,2); 515 testes | Eram as áreas com 0–65%, só cobertas por e2e. Os limiares do CI subiram para 90 / 85 / 88 / 92 (statements / branches / functions / lines) para travar o ganho. |
| **Fonte pré-carregada** (`index.html`) | `<link rel="preload" as="font">` do subconjunto latino da Plus Jakarta Sans | O CLS de `/produtos` (0,108) vinha da troca de fonte (causa apontada pelo Lighthouse: "Web font loaded"). Com o preload o CLS passou a oscilar entre 0 e 0,108 conforme a ordem de chegada; é **melhor esforço** (se o Google publicar outra versão do arquivo, só se perde o ganho). |

**Sugestões avaliadas e não adotadas**

| Sugestão | Decisão | Motivo |
| --- | --- | --- |
| Trocar `axios` por `fetch` (~35 kB) | Não | O requisito 7 pede *interceptors*, recurso do axios; trocar exigiria reimplementá-los e reescrever os testes por ganho pequeno. |
| Carregar modais/notificações sob demanda | Não | As notificações são disparadas pelo interceptor de resposta (todas as telas); o ganho (~27 kB de fonte) não justifica a complexidade. |
| Podar o CSS do Mantine | Não | Risco de perder estilos (principalmente no tema escuro) maior que o ganho (ver "Pacote 8"). |
| Persistir o estado do admin no `localStorage` | Não | A DummyJSON só simula escrita; manter o estado apenas na sessão deixa explícito que não há persistência real. |

**Resultado do desempenho (Lighthouse local, perfil móvel padrão):** acessibilidade 0,95–0,96, SEO 0,9, melhores práticas 0,82; desempenho 0,38–0,43 (FCP ~4 s, LCP ~6 s, TBT ~1,4 s). A meta de 0,7 segue em aberto: o custo é o JavaScript do *framework* (react-dom, Mantine, floating-ui, axios, TanStack Query), que não se divide por rota.

**Observação de ambiente:** dois servidores `yarn dev` esquecidos em segundo plano (~110% de CPU cada) causaram *timeouts* intermitentes nos e2e (axe em páginas grandes). Com a máquina livre a suíte inteira (117 testes) passa em ~6,5 min.

## Pacote 10: papéis (administrador × cliente) e login de demonstração

**Problema:** qualquer usuário logado entrava na área administrativa. Para ficar mais próximo de um ambiente real, a loja passou a separar o **administrador** do **cliente**.

| Decisão | Como ficou | Motivo |
| --- | --- | --- |
| **Papel vem de `/auth/me`** | Depois do login, `fetchRole()` consulta `/auth/me` (o login da DummyJSON não devolve `role`) e o guarda em `SessionUser.role` | É o único endpoint da API que expõe o papel. |
| **Padrão seguro** | Falha de rede, 401 ou resposta inesperada ⇒ `user` (cliente), nunca admin. Sessão salva antes desta versão (sem `role`) também vale como cliente até o próximo login | Um erro jamais deve promover alguém a administrador. A consulta falha em silêncio (sem notificação) no interceptor. |
| **Só `admin` entra** | `ProtectedRoute role="admin"` em `/admin/*`. Moderador **não** acessa | Regra mais simples de explicar; a API tem 5 admins, 10 moderadores e 193 clientes. |
| **"Acesso restrito"** | Cliente logado em `/admin/*` vê uma página explicando e com botão "Voltar para a loja" (visitante continua indo ao login) | Mais claro que uma tela vazia ou um redirecionamento mudo. |
| **Interface por papel** | Dashboard, Gerenciar produtos e "Administração" (menu do usuário) só para admin. Pós-login: admin → `/admin`; cliente → loja (ou o destino pedido, como o carrinho no checkout) | Separa as responsabilidades; o cliente só vê o que é dele. |
| **Login de demonstração** | Título "Demonstração" e duas contas: administrativa (`emilys` / `emilyspass`) e cliente (`averyp` / `averyppass`, `role: user` na API). Título da página passou de "Área administrativa" para "Entrar" | Quem avalia vê as duas visões sem procurar credenciais; ambas são contas **públicas** da DummyJSON. |
| **Sem cadastro** | Nota discreta sob "Voltar para a loja": em ambiente real haveria cadastro de novos clientes; não foi implementado porque a DummyJSON não persiste os dados | `POST /users/add` responde "criado" mas a conta nova **não consegue logar** (testado); fingir cadastro enganaria o usuário. |

**Limite registrado:** a checagem de papel no front-end é só de **interface**, não de segurança. Em produção, a autorização é do backend (a DummyJSON não oferece isso).

**Pagamento no checkout:** implementado no Pacote 11 (Pix, cartão e boleto, tudo simulado).

Testes: unitários de schema, `fetchRole`, `useAuth`, `ProtectedRoute` (com e sem papel), Login, cabeçalho por papel e interceptor (`/auth/me` silencioso); e2e `e2e/roles.spec.ts` (admin entra, cliente é barrado, cliente no checkout volta ao carrinho, falha de `/auth/me` não promove a admin, axe em claro e escuro) e ajuste do mock (`averyp` e `/auth/me` por token). Sessões salvas sem papel têm teste próprio.

## Pacote 11: checkout com forma de pagamento (simulada)

O modal de confirmação foi substituído pela página `/checkout` (exige login, qualquer papel) com três etapas: **Pagamento → Revisão → Confirmação**. Nada é cobrado, nada é guardado e **nenhum dado de cartão é pedido**.

| Decisão | Como ficou | Motivo |
| --- | --- | --- |
| **Sem campos de cartão** | Não existe campo de número, validade ou CVV. Mostramos um "cartão de teste" (•••• 4242, com o **nome do usuário logado**) e a escolha de parcelas. Textos curtos explicam: "Não pedimos os dados do seu cartão" e "Em uma loja real, o número seria digitado num campo seguro do processador de pagamentos, nunca nesta página" | Mesmo em demonstração, formulários de cartão falsos treinam o usuário a digitar dados reais em qualquer site; em produção esses dados nunca passam pelo código da loja (o gateway os captura). Há e2e garantindo que nenhum desses campos existe. |
| **Pix** | 5% de desconto; QR **ilustrativo** (SVG, `aria-hidden`) e código "copia e cola" de demonstração (`SIMULADO#####`) com botão Copiar | O QR não leva a pagamento algum, e o texto diz isso. |
| **Boleto** | 3% de desconto; linha digitável fictícia e vencimento em 3 dias úteis | "Boleto fictício: não pode ser pago." |
| **Cartão** | Sem desconto; até **12x sem juros**, com parcela mínima de US$ 5 (convertida pela cotação), então pedidos pequenos oferecem menos opções (nunca menos de 1x) | Como nas lojas reais. As parcelas são calculadas em centavos **da moeda exibida**; a primeira parcela absorve os centavos que sobram, e a soma fecha exatamente com o total. |
| **Base do desconto** | Incide sobre os produtos já com cupom; o **frete não entra**. O frete grátis é decidido antes (valor depois do cupom), então escolher Pix não faz o frete voltar a ser cobrado | Evita que o desconto "ressuscite" o frete e deixa a regra fácil de explicar. Funções puras e testadas em `helpers/payment.ts`. |
| **Moeda** | Mesmo comportamento de antes: R$ em pt-BR (cotação do dia), US$ em en | Decisão do usuário. |
| **Estado** | Método e parcelas ficam no estado da página, sem `localStorage`. Ao confirmar, o carrinho e o cupom são limpos e aparece o número do pedido (`SIM-#####`) | Nada de pagamento persiste, o que combina com a mensagem "nenhum dado foi guardado". Carrinho vazio em `/checkout` volta para `/carrinho`. |
| **Fluxo** | "Finalizar compra" navega para `/checkout`; visitante vai ao login e **volta ao checkout** depois de entrar | Substitui o modal e a "retomada" do state do login. |

Cores: o painel de cada forma de pagamento usa o mesmo azul suave dos painéis do dashboard (`PANEL_BG`) e o resumo do pedido usa um verde-água suave próprio (`CHECKOUT_SUMMARY_BG`, em `theme/surfaces.ts`), nos dois temas, para separar "o que você está pagando" de "quanto fica". Um teste e2e confere que os fundos diferem entre si e da página; a diferença é sutil de propósito, então as capturas de regressão visual foram regeradas com `--update-snapshots=all` (o modo padrão ignora diferenças pequenas).

Acessibilidade: grupo de rádio com rótulo, foco no título a cada etapa, ilustrações `aria-hidden` (o texto equivalente fica visível) e contraste verificado pelo axe nos dois temas em todas as etapas.

Testes: `helpers/payment.test.ts` (descontos, parcelas, códigos), `pages/checkout.test.tsx`, `e2e/payment.spec.ts` (campos de cartão inexistentes, descontos, fluxo completo, login retoma o checkout, axe em todas as etapas) e regressão visual `e2e/visual/checkout.spec.ts` (claro/escuro). Ajustados `checkout.spec.ts`, `roles.spec.ts`, `cart.test.tsx` e `order-summary.test.tsx`, que dependiam do modal.

## Pacote 12: revisão externa (11/10/2026)

Um colega analisou a aplicação publicada com apoio de um agente de IA (suíte do projeto + 36 testes exploratórios, em Chromium/Linux, API interceptada pelo mock do projeto). O relatório confirmou os resultados do projeto (572 testes unitários e 135 de 136 e2e passando no commit `8deeb33`, bundle publicado idêntico ao local) e apontou os itens abaixo. **Cada um foi reproduzido no código antes de ser corrigido**, e todos são reais:

| ID | Achado | Correção | Motivo |
| --- | --- | --- | --- |
| **D1** (alta) | O carrinho aceitava qualquer quantidade, acima do estoque, até o checkout (5 cliques em "Adicionar" no produto de 3 unidades davam 5; digitar 99 no carrinho era aceito) | O item do carrinho guarda o `stock`; `addItem`, `setQuantity` e `restoreItems` (desfazer) limitam a quantidade com `Math.min`; produto esgotado não entra; o campo da página do carrinho tem `max`; os detalhes avisam "Estoque limitado" quando a quantidade pedida foi reduzida | Antes só o botão "+" dos cards checava o estoque. A regra agora está no **contexto do carrinho** (fonte única), então nenhuma tela consegue furá-la. Carrinhos salvos por versões antigas (sem `stock`) continuam sem limite. |
| **D2** | Telas de erro diziam "Tente novamente" mas não tinham o botão | `useApiQuery` passou a devolver `retry` (o `refetch`) no estado de erro e as 9 telas passam `onRetry` ao `ErrorState` | O componente já suportava o botão; faltava ligá-lo. |
| **D3** | `/produtos/99999` mostrava o texto cru da API em inglês e `/produtos/abc` uma mensagem genérica | `NotFoundError` (id inválido) e qualquer 404 viram "Produto não encontrado…" traduzido; a página oferece "Ver todos os produtos" | Interface em português com erro em inglês quebra a consistência; faltava caminho de volta. O toast do interceptor continua aparecendo junto com a mensagem da página (comportamento antigo, mantido). |
| **D4** | A tela de login não tinha região `main` nem "Pular para o conteúdo" | `AuthLayout` usa o mesmo `SkipLink` e `<main id="main-content">` das demais páginas | O axe não acusa (são "boas práticas", fora das tags WCAG que usamos), mas a navegação por teclado ficava inconsistente. |
| **D5** | Credencial errada mostrava a mesma mensagem sob os dois campos (anunciada duas vezes) | Um único `Alert` (`role="alert"`) acima do formulário | Leitor de tela anuncia uma vez; a mensagem não diz qual campo está errado, o que também é melhor para segurança. |
| **T1** | Teste "Em inglês" instável (falhava em 4 de 10 execuções) | Espera o menu de idioma fechar antes de rodar o axe | Defeito do teste, não do site: o axe via o menu pela metade. 10 de 10 depois da correção. |
| Engines | A instalação falhava em Node 22.22.0 | `engines.node` passou a `>=22.22.2`, o que o jsdom 30 exige | O CI usa o Node 22 mais recente (`.nvmrc`), então não era afetado, mas quem instalasse com 22.22.0 recebia erro confuso. |

**Não adotado:** dividir o bundle principal (687 kB) com import dinâmico (sugestão opcional do relatório). Já investigado no "Pacote 8": é framework (react-dom, Mantine) e não se divide por rota.

Testes novos: `cart-provider.test.tsx` (limite de estoque, 7 casos), `products.test.tsx` (tentar novamente), `login.test.tsx` (alerta único), `auth-layout.test.tsx` (main e link de pular), `api.test.ts` (404 e id inválido) e `e2e/review-fixes.spec.ts` (os cinco defeitos de ponta a ponta). O teste de id inválido em `catalog.spec.ts` esperava o texto genérico antigo e foi atualizado.

## Edge cases cobertos

Login vazio/senha curta/credencial inválida (400); busca sem resultados; resposta da API fora do schema; `id` inválido em `/produtos/:id`; quantidade 0/negativa no carrinho e carrinho corrompido no localStorage; preço ≤ 0, estoque negativo/fracionado e título vazio no formulário; token sem usuário salvo; página fora do intervalo.

## Decisões técnicas

| Decisão | Motivo |
| --- | --- |
| Conversão de moeda **só na exibição** (API e carrinho em USD) | Converter dados poderia corrompê-los e geraria inconsistência entre telas e idiomas. |
| Idioma detectado por navegador + fuso, **sem IP** | Privacidade (LGPD), sem dependência externa e funciona offline/em testes. |
| Escritas do admin **simuladas e locais** (`AdminStoreProvider`) | A DummyJSON responde sucesso mas não persiste; o aviso na UI evita parecer bug. |
| `zod4Resolver` (não `zodResolver`) | O resolver clássico lê `error.errors` (Zod 3) e quebra com Zod 4 — causou um bug real de login. |
| Mensagens de validação como **chaves i18n** nos schemas | Mantém os schemas estáticos/testáveis e traduz só na exibição. |
| Categorias traduzidas pelo **slug** | Slug é estável; filtros e URLs não mudam com o idioma. |
| Avatar com **iniciais** | O avatar da DummyJSON é um identicon sem significado e exige rede; iniciais funcionam offline e seguem o padrão de mercado. |
| **Code-splitting por rota** + `Suspense` | O bundle único tinha 858 kB (267 kB gzip); o chunk inicial caiu para 621 kB (191 kB gzip) e o admin só carrega para quem entra nele. |
| **TanStack Query** para dados do servidor | Cache, deduplicação e cancelamento prontos e testados, em vez de um hook próprio com dependências manuais. `staleTime` por tipo de dado (categorias 30 min, demais 1 min). |
| E2E com **API interceptada** | Determinismo e velocidade; a API real fica só em um smoke test opcional que detecta quebra de contrato. |
| Filtro de marca **no cliente**, exato, via URL (`?marca=`) | Não há endpoint de marca e a busca por texto é imprecisa; a URL mantém o filtro compartilhável e compatível com o botão voltar. |
| **`ErrorBoundary`** em torno das rotas (limpa ao navegar) | Um erro de renderização ou falha ao baixar um chunk não deixa mais a tela em branco. |
| `"strict": true` explícito | O TS 6 já o ativa por padrão; declarar torna a intenção clara e protege contra mudanças de padrão. |

## Revisão técnica e backlog

Resultado da revisão sênior (requisitos × boas práticas). Itens marcados ✅ já foram aplicados.

**Alta prioridade**
- ✅ Code-splitting por rota, `ErrorBoundary`, `strict` explícito, remoção do CSS não usado de `@mantine/dates`, ids locais centralizados em `helpers/ids.ts`, cores adaptativas ao tema escuro nos cards.
- ✅ **TanStack Query** no lugar de `useAsyncData` (`hooks/use-api-query.ts`, `lib/query-client.ts`): cache, deduplicação (categorias viram uma só requisição, cache de 30 min), cancelamento, retry apenas para rede/5xx e fim do `eslint-disable` de dependências.
- ✅ **E2E sem rede externa**: DummyJSON e câmbio interceptados com `page.route` (`e2e/fixtures/mock-api.ts`); só `e2e/real/smoke.spec.ts` usa a API real (`yarn e2e:real`), para o CI não falhar por instabilidade de terceiros.
- ✅ **Repositório Git público**, GitHub Pages (source: Actions) e proteção da `main` (PR + checks `test` e `lighthouse`) — requisito 10; ver "Configuração no GitHub".

**Média prioridade**
- ✅ Validar `exp` do JWT no cliente (ver "Robustez e qualidade"). **Risco registrado:** guardar o token em `localStorage` o expõe a XSS; é aceitável aqui (exigência do enunciado, API pública) e mitigado por não renderizarmos HTML de terceiros nem usarmos `dangerouslySetInnerHTML`. Em produção real, preferir cookie `HttpOnly` emitido pelo backend.
- ✅ `JSON.parse(...) as X` substituído por validação com Zod.
- ✅ Chaves do i18n tipadas.
- ✅ Gráficos no dashboard (ver "Dashboard: gráficos").
- ✅ Prettier, `engines`/`.nvmrc`, limiares de cobertura, Dependabot e testes de `product-form`, `admin-products`, `product-details` e `api.ts`.
- ✅ Imagem de reserva para produtos sem foto ou com imagem quebrada.

**Melhorias de UI**
- ✅ `Skeleton` no lugar do `Loader` central e `loading="lazy"` nas imagens (ver "Polimento de UX").
- ✅ Breadcrumbs nos detalhes e atalhos de categoria/marca (ver "Navegação por categoria e marca").
- ✅ Ordenação, badge de desconto, aviso de estoque, galeria de imagens e favoritos (ver "Pacote 2" e "Pacote 3").
- ✅ Ao paginar, rolar ao topo e mover o foco; `document.title` por rota.
- ✅ Link "Pular para o conteúdo" e auditoria de contraste/acessibilidade com axe nos e2e (ver "Pacote 4").
- ✅ Carrinho empilhado em telas pequenas, "desfazer" ao remover e "ver todas as categorias" na Home.
- ✅ Painéis e gráficos clicáveis, ordenação/seleção/edição/CSV no admin (ver "Pacote 7"); PWA, Lighthouse no CI e regressão visual (ver "Pacote 8").

## Verificação e pontos em aberto

**Última verificação completa (11/10/2026):** Prettier, `tsc` e ESLint limpos; Vitest 585 testes (cobertura 95,2% / 92,2% / 93,2% / 96,5%); e2e 143 testes; regressão visual 10 testes; smoke com a API real (login + papel); `yarn audit` sem vulnerabilidades nas dependências de produção.

**No site publicado (GitHub Pages, 10/10/2026):** a suíte e2e inteira roda contra a URL pública (`E2E_BASE_URL=... yarn e2e`): 135 de 136 passaram na primeira rodada; a falha era uma corrida do próprio teste (lia a lista antes de ela renderizar), corrigida e repetida 6 vezes sem erro. Smoke com a API real passou. Lighthouse na URL pública: acessibilidade 0,95, melhores práticas 1,0, SEO 0,9, CLS 0 e desempenho 0,42–0,44. Links diretos (ex.: `/produtos/4`) respondem com o `404.html` do Pages, que é a própria SPA, então abrem normalmente (o status HTTP 404 é uma limitação do Pages).

**Em aberto, por escolha:**
- **Desempenho no Lighthouse** (~0,4 contra a meta de 0,7) e **CLS de `/produtos`** (oscila entre 0 e 0,108): ver "Pacote 8" e "Pacote 9". O piso do CI é 0,3 (anti-regressão); acessibilidade (≥ 0,9) passa com folga.
- **CI no GitHub:** na primeira execução (10/10/2026) os jobs `test` (formatação, tipos, lint, Vitest com cobertura e Playwright) e `lighthouse` passaram. O Lighthouse pode oscilar no *runner*; se acontecer, ajustar `lighthouserc.json`.
- **Regressão visual** roda só localmente (as imagens base são do Windows).

**Decisões deliberadas (não reabrir sem motivo):** só `admin` (não moderador) acessa o painel; sem cadastro de novos usuários; produtos criados no admin não aparecem na loja pública; sem campo de imagem no formulário; sem persistência do admin; `axios` mantido (interceptors do requisito 7); nenhum dado de cartão é pedido no checkout.

## Uso de IA

O Claude Code (Anthropic) foi usado como assistente: planejamento da arquitetura, geração do código inicial, schemas Zod, testes (incluindo a sugestão de casos de borda) e workflows de CI/CD. Todo o código foi revisado e executado localmente (tsc, ESLint, Vitest e Playwright); a IA também ajudou a diagnosticar problemas reais, como a incompatibilidade `zodResolver` × Zod 4 e uma condição de corrida no logout.
