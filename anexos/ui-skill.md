# 🎨 Mantine UI Skill

Este documento define os padrões para a criação e refatoração de interfaces frontend utilizando a biblioteca **Mantine UI**. Todo código gerado ou modificado deve seguir estas diretrizes para garantir uma UI consistente, limpa, responsiva e que aproveite ao máximo os recursos nativos e o tema configurado do Mantine.

## 1. Estrutura e Layout de Páginas

As páginas devem ser construídas com componentes nativos de layout do Mantine, aproveitando as configurações padrão do tema e evitando estruturas redundantes.

- **Container Principal:** Utilize o `<Container>` do Mantine para centralizar e padronizar a largura máxima e o alinhamento das páginas.
  - **Uso:** `<Container size="lg" py="xl"> ... </Container>`
- **Espaçamento e Agrupamento (`Stack` e `Group`):**
  - O tema da aplicação já define **`gap="lg"` como padrão** para os componentes `<Stack>` e `<Group>`.
  - **`<Stack>`:** Utilize para empilhar elementos na vertical (como formulários ou listas de seções). Não adicione `gap="lg"` manualmente; defina a prop `gap` apenas quando precisar alterar o espaçamento em relação ao padrão (ex: `gap="xs"`, `gap="sm"`).
  - **`<Group>`:** Utilize para alinhar elementos na horizontal (como botões de ação, badges ou ícones acompanhados de texto). Defina o alinhamento via props (ex: `justify="space-between"`, `justify="flex-end"`, `align="center"`).
- **Cards de Conteúdo:** Use o componente `<Card>` para agrupar informações relacionadas.
  - **Padrão do Tema:** O tema já configura `padding="lg"`, `withBorder={true}`, `shadow="sm"` e layout interno em coluna com `gap="lg"`. **Não passe essas props manualmente** nem adicione um `<Stack>` como filho direto do `<Card>` apenas para espaçar os itens.

## 2. Tipografia e Hierarquia Visual

- **Hierarquia de Títulos (`<Title>`):**
  - `<Title order={1}>`: Reservado para o título principal da página. Use apenas uma vez por tela.
  - `<Title order={2}>`: Para títulos de seções principais.
  - `<Title order={3}>`: Para subseções ou títulos de cards e modais.
  - Evite pular níveis na hierarquia visual (ex: passar de `order={1}` direto para `order={4}`).
- **Textos (`<Text>`):**
  - Use a prop `c="dimmed"` para textos secundários ou legendas.
  - Utilize as props nativas de tamanho (`size="sm"`, `size="lg"`) e peso (`fw={500}`, `fw={700}`) em vez de CSS inline ou classes customizadas.

## 3. Uso do Tema e Estilização (Mantine System)

- **Componentes Pré-configurados no Tema (Evite Props Redundantes):**
  - **`<Card>`:** Já possui `padding="lg"`, `withBorder={true}`, `shadow="sm"` e layout interno vertical com `gap="lg"`.
  - **`<Stack>` e `<Group>`:** Já possuem `gap="lg"` por padrão.
  - **Inputs e Buttons (`TextInput`, `PasswordInput`, `Select`, `Button`):** Já possuem `size="md"` configurado por padrão no tema.
- **Cores e Paleta:**
  - **NUNCA** utilize valores hexadecimais aleatórios ou inline styles quando houver equivalentes no tema.
  - Utilize as cores da paleta do Mantine (ex: `color="blue"`, `color="secondary"`, `c="red.6"`, `bg="gray.0"`).
  - Use `color="red"` para ações destrutivas ou de perigo.
- **Style Props (Mantine System):**
  - Evite criar arquivos `.css` ou `.module.css` avulsos para espaçamentos e layouts simples.
  - Utilize as _style props_ nativas do Mantine: margens (`mt`, `mb`, `my`, `mx`), paddings (`pt`, `pb`, `p`), dimensões (`w`, `h`, `mw`, `miw`), flexbox (`flex`, `display`) e posicionamento.
  - Para layouts flexíveis ou em grade, prefira usar os componentes `<Flex>`, `<Grid>` ou `<SimpleGrid>`.

## 4. Componentes e Interações de UI/UX

- **Hierarquia Visual de Botões (`<Button>`):**
  - `variant="filled"`: Apenas para a **AÇÃO PRINCIPAL** da tela, seção ou formulário.
  - `variant="light"`: Ações secundárias importantes.
  - `variant="outline"` ou `variant="subtle"`: Ações neutras, menos prioritárias ou utilitárias (ex: "Voltar", "Cancelar", "Filtrar").
- **Modais e Diálogos:**
  - Para diálogos de confirmação rápidos e modais dinâmicos, utilize o pacote `@mantine/modals` (`modals.openConfirmModal`, `modals.openContextModal`).
  - Para modais complexos de formulário ou fluxos dedicados, utilize o componente nativo `<Modal>`.
- **Notificações e Feedback:**
  - Utilize o pacote `@mantine/notifications` (`notifications.show`) para disparar mensagens de sucesso, alerta ou erro para o usuário.
- **Ícones:**
  - Utilize a biblioteca `@tabler/icons-react` para os ícones da aplicação. Mantenha consistência nos tamanhos (`size={18}` ou `size={20}`).
- **Acessibilidade e Mobile:**
  - **Inputs:** Defina os atributos nativos adequados para melhor experiência em dispositivos móveis (ex: `type="email"`, `inputMode="tel"`, `autoComplete`).
  - **Spoiler / Collapsible:** Para telas móbiles com excesso de informação, utilize `<Spoiler>` para reduzir a poluição visual.

## 5. Formulários com `@mantine/form`

- **Gerenciamento de Estado de Formulários:**
  - Utilize o hook nativo `useForm` do pacote `@mantine/form` para controlar valores, validações e estado de submissão.
- **Exibição de Erros:**
  - Configure as regras de validação no `validate` do `useForm` para que os erros sejam injetados e exibidos automaticamente nos campos (`TextInput`, `Select`, `PasswordInput`, etc.).
  - Ao capturar erros de requisições à API, utilize `form.setErrors()` para mapear os campos afetados.

## 6. Arquitetura de Componentes

- **Separação de Responsabilidades:**
  - Em telas ou componentes com lógica complexa (múltiplos estados, busca de dados, manipulação de tabelas), extraia a lógica de negócio e estados para um custom hook dedicado (ex: `useUserManagement.ts`).
  - Mantenha o componente de UI focado apenas na renderização e interações de apresentação.

## 7. Qualidade de Código e TypeScript

- **Tipagem Estrita:** Garanta que todas as props de componentes customizados e retornos de hooks estejam devidamente tipados com TypeScript.
- **Validação de Tipos:** Execute a checagem de tipos (`tsc --noEmit` ou script de verificação do projeto) para garantir que não existam erros de compilação ou incompatibilidade de props.
