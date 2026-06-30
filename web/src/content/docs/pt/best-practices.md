---
title: "Melhores Práticas & Dependências"
description: "Aprenda a estruturar seu código para entrega JIT e gerenciar dependências com LC:Require."
icon: "build"
---
Para adaptar seu código legado à arquitetura em nuvem e aproveitar o carregamento Just-In-Time (JIT), siga estas regras:

- **Centralizar a Lógica:** Um arquivo baixado carrega todos os seus comandos internos na memória instantaneamente. Agrupe comandos relacionados.
- **LC:Require:** Se um script depende de outro (ex: biblioteca de matemática), use `(LC:Require "NomeDaBiblioteca")` no topo do seu LISP.
- **Permissões de Suite:** O arquivo principal e suas dependências DEVEM pertencer à mesma Suite no LispCentral para passar nas verificações de DRM.
