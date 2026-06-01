---
name: LispCentral
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#38393a'
  surface-container-lowest: '#0d0e0f'
  surface-container-low: '#1a1c1c'
  surface-container: '#1e2020'
  surface-container-high: '#292a2a'
  surface-container-highest: '#343535'
  on-surface: '#e3e2e2'
  on-surface-variant: '#e2bfb0'
  inverse-surface: '#e3e2e2'
  inverse-on-surface: '#2f3131'
  outline: '#a98a7d'
  outline-variant: '#5a4136'
  surface-tint: '#ffb693'
  primary: '#ffb693'
  on-primary: '#561f00'
  primary-container: '#ff6b00'
  on-primary-container: '#572000'
  inverse-primary: '#a04100'
  secondary: '#c9c6c5'
  on-secondary: '#313030'
  secondary-container: '#4a4949'
  on-secondary-container: '#bab8b7'
  tertiary: '#c8c6c5'
  on-tertiary: '#313030'
  tertiary-container: '#9a9898'
  on-tertiary-container: '#313131'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbcc'
  primary-fixed-dim: '#ffb693'
  on-primary-fixed: '#351000'
  on-primary-fixed-variant: '#7a3000'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c9c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474646'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#121414'
  on-background: '#e3e2e2'
  surface-variant: '#343535'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-max-width: 1200px
  gutter: 24px
  margin-mobile: 16px
  section-padding: 80px
---

## Brand & Style

A personalidade desta marca é fundamentada na precisão técnica e na eficiência da engenharia de software aplicada ao design industrial. O sistema visual evoca uma sensação de autoridade "Developer-First", focada em gestores BIM e coordenadores de engenharia que exigem segurança e performance.

O estilo de design é **Corporate Modern com influência de Developer Tools**, utilizando uma interface Dark Mode profunda. A estética é limpa e utilitária, mas elevada por acentos vibrantes que guiam o olhar para ações críticas. O objetivo é transmitir uma ferramenta que é simultaneamente uma infraestrutura robusta e uma interface de ponta, removendo o ruído visual para focar no gerenciamento de código.

**Atributos da Marca:**
- **Técnica:** Focada em precisão e lógica.
- **Segura:** Proteção de propriedade intelectual como prioridade.
- **Pioneira:** Modernizando fluxos de trabalho legados para a nuvem.
- **Direta:** Sem ornamentos desnecessários, priorizando a funcionalidade.

## Colors

A paleta é centrada em um ambiente de alto contraste para reduzir a fadiga ocular durante longas sessões de codificação e gerenciamento.

- **Primary (#FF6B00):** O "Vibrant Orange". Usado exclusivamente para chamadas de ação (CTAs), ícones de destaque e status ativos. Representa energia e a ignição de processos.
- **Surface & Background (#0A0A0A, #141414):** Tons de carvão profundo que criam a fundação do sistema. O contraste entre o fundo e os containers é sutil para manter a elegância.
- **Text & UI Elements:** O branco puro (#FFFFFF) é reservado para títulos e leitura primária, enquanto o cinza médio (#B0B0B0) é utilizado para textos de apoio e metadados, estabelecendo uma hierarquia clara.
- **Success/Warning/Error:** Devem seguir a lógica técnica: Verde esmeralda para compilação bem-sucedida, Laranja (Primário) para avisos e Vermelho sistêmico para falhas críticas de segurança.

## Typography

Utilizamos a **Inter** como fonte principal pela sua legibilidade excepcional em telas e caráter neutro, porém moderno. 

- **Títulos:** Devem ser impactantes e densos. O uso de `font-weight: 700` em tamanhos grandes comunica a solidez da plataforma B2B.
- **Corpo de Texto:** Mantido em pesos médios (400) com altura de linha generosa (1.6) para facilitar a leitura de documentações técnicas.
- **Mono-espaçamento:** Para trechos de código LISP ou identificadores de sistema, deve-se integrar a **JetBrains Mono** ou similar, reforçando o DNA de engenharia do produto.
- **Hierarquia:** Use a cor `text-secondary` (#B0B0B0) em labels e descrições para garantir que os títulos em branco se destaquem imediatamente.

## Layout & Spacing

O sistema utiliza um **Grid Fluido de 12 colunas** para desktop, adaptando-se para 4 colunas em dispositivos móveis. A escala de espaçamento é baseada em múltiplos de 8px para manter o alinhamento matemático rigoroso.

- **Densidade:** Moderada. Embora seja uma ferramenta técnica, o uso de espaços em branco (negative space) entre seções (`80px+`) é essencial para evitar a sobrecarga cognitiva do usuário.
- **Containers:** Cards e módulos de conteúdo devem utilizar paddings internos consistentes (ex: `24px` ou `32px`) para criar zonas de foco claras.
- **Alinhamento:** Todo o conteúdo textual deve seguir o alinhamento à esquerda, reforçando a lógica de leitura de código e documentação.

## Elevation & Depth

A profundidade neste design system é comunicada através de **Camadas Tonais** e bordas sutis, evitando sombras excessivamente difusas que podem parecer informais.

- **Nível 0 (Background):** #0A0A0A - A base absoluta.
- **Nível 1 (Cards/Containers):** #141414 - Superfícies levemente elevadas. Devem possuir uma borda fina de 1px em `#262626` para definir seus limites sem criar ruído.
- **Interação (Hover):** Ao interagir com elementos clicáveis, a borda pode transicionar para o laranja primário (#FF6B00) ou aumentar ligeiramente a luminosidade do fundo para #1A1A1A.
- **Destaque:** O uso de gradientes sutis (de #141414 para #0D0D0D) pode ser aplicado em grandes seções para guiar o fluxo visual de cima para baixo.

## Shapes

O sistema utiliza uma linguagem de formas **Soft (Suave)**, com cantos levemente arredondados (`4px` a `12px`). Esta escolha equilibra a rigidez da engenharia com a modernidade de um software SaaS atual.

- **Componentes Pequenos (Inputs, Tags):** Utilizam `rounded-sm` (4px).
- **Cards e Botões Principais:** Utilizam `rounded-lg` (8px).
- **Elementos de Interface Especial (Modais, Menus Suspensos):** Podem chegar a `12px` para suavizar a sobreposição sobre o conteúdo principal.
- **Ícones:** Devem seguir um estilo linear com espessura de 1.5px ou 2px, sempre com terminações levemente arredondadas para consistência.

## Components

### Buttons
- **Primary:** Fundo #FF6B00, texto #FFFFFF, peso bold. Efeito de hover com leve aumento de brilho.
- **Secondary (Ghost):** Borda 1px #FF6B00, texto #FF6B00, sem fundo. Para ações de apoio.
- **Outline:** Borda 1px #262626, texto #FFFFFF. Para ações neutras ou secundárias.

### Cards
Superfícies em #141414 com borda de 1px #262626. Ícones dentro dos cards devem utilizar o laranja primário para criar pontos de ancoragem visual. Títulos de cards sempre em branco.

### Input Fields
Fundo #0D0D0D, borda 1px #262626, texto #FFFFFF. Ao focar (focus), a borda torna-se #FF6B00 com um "glow" externo muito sutil.

### Chips & Badges
Utilizados para categorias de código (ex: "BIM", "LISP", "Automation"). Devem ter fundo cinza escuro e texto em #B0B0B0, mudando para laranja quando selecionados.

### Technical Visuals
Gráficos e diagramas devem usar linhas finas, pontilhados e elementos que remetam a desenhos técnicos do AutoCAD (Blueprints), mantendo a paleta monocromática com acentos em laranja.