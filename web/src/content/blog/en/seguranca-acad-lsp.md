---
title: 'O Caos do acad.lsp: Como gerenciar e proteger a Propriedade Intelectual (IP) do seu código'
description: 'Aprenda como vírus de AutoCAD utilizam o acad.lsp e entenda por que armazenar rotinas LISP em pastas de rede expõe sua empresa ao roubo de Propriedade Intelectual.'
pubDate: 2026-05-28
heroImage: 'https://images.unsplash.com/photo-1510511459019-5efa32f5fb1b?q=80&w=1200&auto=format&fit=crop'
author: 'Equipe LispCentral'
tags: ["lisp programming", "acad lsp", "autocad lisp command"]
---

**TL;DR:** Gerenciar sua automação LISP espalhando arquivos pela rede da empresa via `acad.lsp` é um modelo ultrapassado. Além da grande vulnerabilidade a vírus de macro que destroem arquivos DWG, o código-fonte proprietário da empresa fica exposto ao roubo em pen-drives e invasões offline. O mercado se move para plataformas SaaS (como LispCentral), onde o código reside em servidores criptografados e executa via injeção RAM (Zero-Disk).

Todo CAD/BIM Manager experiente sabe o valor de um código bem construído. Uma rotina AutoLISP capaz de detalhar escadas, perfis metálicos estruturais ou extrair quantitativos complexos representa dezenas de horas e milhares de dólares em pesquisa e desenvolvimento.

Contudo, muitas empresas tratam essa *Propriedade Intelectual (IP)* da pior forma possível: salvando o arquivo `rotina-milagrosa.lsp` na unidade `Z:\Rede\CAD\`.

## A Falha Fundamental de Segurança do "acad.lsp"

Quando o AutoCAD é iniciado ou quando um novo projeto (`.dwg`) é aberto, ele obedece a uma rotina de checagem. Se existir um arquivo chamado `acad.lsp` ou `acaddoc.lsp` no mesmo diretório do arquivo do projeto, ou na rede configurada como *Support Path*, o AutoCAD carrega e executa esse código LISP cegamente.

> [!WARNING]
> **O Vetor de Ataque de Vírus do AutoCAD:**
> Hackers e malwares antigos escrevem "vírus de macro" no AutoCAD usando esta falha. O vírus LISP se auto-copia para todas as pastas de rede infectando os arquivos `acad.lsp`. Ao abrir o DWG, ele bloqueia os comandos `EXPLODE` ou `BURST`, danificando a usabilidade do projeto até que seja varrido manualmente.

### Por que a Criptografia NATIVA (.FAS/.VLX) não é o suficiente?

A Autodesk oferece uma ferramenta de compilação visual (Make Application) que converte o arquivo texto `.lsp` em arquivos binários indecifráveis: `.fas` (Fast Load) ou `.vlx` (Visual Lisp Executable).

Isto protege o seu "Segredo Industrial" contra concorrentes lendo seu código, certo? **Parcialmente.**
Mesmo que o funcionário mal intencionado (ou concorrente) não consiga "ler" o código fonte do seu `.vlx`, ele ainda pode **roubar e executar o arquivo**. Se ele copiar o arquivo compilado no pen-drive e o levar para abrir a própria empresa dele, a ferramenta (que faz toda a automação da sua empresa lucrar) continuará funcionando perfeitamente lá.

## A Resposta do Mercado Moderno: Arquitetura SaaS JIT

É por isso que as empresas de tecnologia pararam de distribuir CDs e começaram a oferecer serviços nas nuvens (Netflix vs Blockbuster).

A plataforma **LispCentral** traz essa tecnologia SaaS para o AutoLISP, blindando sua infraestrutura com o que chamamos de **Compilação e Execução JIT (Just-In-Time)**.

**Como sua automação fica 100% segura com o LispCentral:**
1. Você não salva os LISPs na rede local. Você os cadastra (upload) no seu Painel LispCentral via web (Firebase Hosting de alta segurança).
2. O seu funcionário utiliza o AutoCAD com a **Paleta LispCentral**. Quando ele clica em "Gerar Pilar", a Paleta envia um pedido de autenticação via Token (HTTPS).
3. O servidor checa: "Este usuário tem licença e permissão ativa no seu Dashboard?".
4. Se sim, o servidor devolve o código LISP de volta, e ele é injetado diretamente na **Memória RAM** do AutoCAD.

O arquivo *LISP nunca escreve nem um único byte no disco rígido* do computador local do funcionário. Se o funcionário sair da empresa e você desligar a chave dele no Painel LispCentral, no segundo seguinte, nada roda mais. Nenhuma IP corporativa foi roubada.

## Perguntas Frequentes (FAQ)

### 1. Meu servidor tem bloqueio de portas e Active Directory (AD). Meus LISPs na rede estão seguros?
Contra hackers externos, talvez. Contra *ameaças internas* (o ex-funcionário com pen-drive/Google Drive copiando as ferramentas para abrir sua própria consultoria), não. A única forma de blindar ameaças internas é retirando o código local da equação.

### 2. E se o AutoCAD estiver sem acesso à internet no momento de rodar o LispCentral JIT?
A arquitetura do LispCentral é pautada na filosofia de **Segurança Online-Only**. Em locais remotos sem absolutamente nenhum sinal (canteiros de obra isolados via satélite), a rotina não validará a sessão (para prevenir sequestros de versão cacheada) e não executará. O custo é ínfimo perante a garantia de IP inviolável.

### 3. Como limpar um vírus alojado em arquivos "acad.lsp"?
A Autodesk disponibiliza gratuitamente no repositório App Store a ferramenta **AutoCAD Security Tool** ou o simples bloqueio da variável de sistema `ACADLSPASDOC=0` e o uso rigoroso de `SECURELOAD`. Consulte nossa documentação oficial para mitigações técnicas.
