---
title: 'O AutoCAD LT agora suporta LISP: Como preparar seu escritório'
description: 'Entenda a recente atualização da Autodesk que liberou o uso de rotinas AutoLISP no AutoCAD LT e descubra como distribuir ferramentas corporativas.'
pubDate: 2026-05-28
heroImage: 'https://images.unsplash.com/photo-1581092921461-7d603a115ab3?q=80&w=1200&auto=format&fit=crop'
author: 'Equipe LispCentral'
tags: ["autocad lt lisp", "autocad 2023 lisp", "autolisp autocad"]
---

**TL;DR:** Por quase três décadas, o **AutoCAD LT** ("Lite") foi estritamente limitado e bloqueado para automação via AutoLISP, forçando empresas a comprar licenças "Full" apenas para rodar macros de produtividade. A partir da atualização 2024, a Autodesk surpreendeu o mercado ativando o suporte nativo a LISP no AutoCAD LT.

A busca por *"autocad lt lisp"* disparou nos fóruns de CAD e Google. Isso acontece porque uma enorme parcela do mercado utiliza a versão LT por questões de custo. A liberação da automação no AutoCAD LT muda drasticamente o jogo corporativo.

## O Histórico: A Barreira do Custo

Até recentemente, o argumento de vendas primário para a versão Completa (Full) do AutoCAD não era necessariamente a capacidade de modelagem 3D, mas sim o **Suporte a API e Extensibilidade** (AutoLISP, .NET, ObjectARX).

Se um escritório de engenharia tivesse 15 desenhistas que precisassem rodar uma simples rotina de "Quantitativo de Blocos" desenvolvida internamente, o BIM Manager era forçado a aprovar a compra de 15 assinaturas caras do AutoCAD Full, justificando a diferença monstruosa de preço anualmente.

## O que muda com o AutoLISP no AutoCAD LT?

Com a atualização recente, os usuários do AutoCAD LT ganharam o superpoder de carregar arquivos `.lsp`, `.fas` e `.vlx`.

> [!TIP]
> **O que você JÁ PODE fazer no AutoCAD LT:**
> *   Carregar rotinas LISP (.lsp) que automatizam desenhos 2D.
> *   Usar o comando `APPLOAD`.
> *   Criar atalhos customizados baseados em rotinas.

> [!WARNING]
> **O que o AutoCAD LT AINDA NÃO PODE fazer:**
> *   Executar plugins complexos em `.NET` (DLLs) ou `ObjectARX` nativos.
> *   Rotinas LISP que invoquem comandos 3D complexos ou renderização (já que o motor do LT carece do *Solid Modeler* completo).

## O Novo Desafio: Distribuição de Ferramentas Corporativas

A liberação gerou um efeito colateral inesperado: dezenas de escritórios que antes não usavam LISP por limitação técnica agora estão inundando seus servidores locais com rotinas baixadas da internet para toda a equipe. Isso criou um pesadelo de gestão e segurança (o caos das versões e vírus de macros).

### A Solução LispCentral

É aqui que a transição de um "cadista isolado" para uma **gestão corporativa** se faz necessária.

Se você tem 20 desenhistas usando AutoCAD LT e acabou de comprar/desenvolver uma *Suite de Arquitetura* em LISP, como garantir que todos usem a mesma versão e ninguém copie o arquivo para casa?

O **LispCentral** permite que você assuma o controle. Ao invés de enviar o arquivo LISP por e-mail, você o sobe na nossa plataforma na Nuvem. O LispCentral funciona como um conector (JIT Compiler): o usuário do AutoCAD LT clica no botão, e a nuvem entrega a rotina direto na memória RAM da máquina, criptografada.

## Perguntas Frequentes (FAQ)

### 1. O AutoCAD LT 2022 ou 2023 roda LISP?
Não nativamente. A Autodesk liberou oficialmente a funcionalidade a partir do AutoCAD LT 2024. Versões anteriores do LT continuam bloqueadas para automação AutoLISP.

### 2. Rotinas antigas de AutoLISP vão rodar no novo AutoCAD LT?
Na vasta maioria dos casos, sim. Desde que a rotina manipule entidades 2D (Linhas, Polilinhas, Círculos, Textos, Blocos) ou extraia dados (Atributos, DXF), ela rodará perfeitamente. Se a rotina invocar modelagem de `3DSOLID`, ela irá falhar.

### 3. Posso usar a plataforma LispCentral no meu AutoCAD LT?
Sim! O "Loader" do LispCentral foi projetado para ser universal e roda nativamente no novo AutoCAD LT, permitindo que escritórios com licenças mistas (Full e LT) utilizem o mesmo Hub na nuvem para gerenciar suas automações.
