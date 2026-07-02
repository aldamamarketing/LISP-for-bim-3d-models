---
title: 'AutoCAD LT Now Supports LISP: How to Prepare Your Office'
description: "Understand Autodesk's recent update that released the use of AutoLISP routines in AutoCAD LT and discover how to distribute corporate tools."
pubDate: 2026-05-28
heroImage: 'https://images.unsplash.com/photo-1581092921461-7d603a115ab3?q=80&w=1200&auto=format&fit=crop'
author: 'Equipe LispCentral'
tags: ["autocad lt lisp", "autocad 2023 lisp", "autolisp autocad"]
---**TL;DR:** For nearly three decades, **AutoCAD LT** ("Lite") was strictly limited and locked to automation via AutoLISP, forcing companies to purchase "Full" licenses just to run productivity macros. Starting with the 2024 update, Autodesk surprised the market by activating native LISP support in AutoCAD LT.

The search for *"autocad lt lisp"* took off on the CAD and Google forums. This happens because a huge portion of the market uses the LT version for cost reasons. The release of automation in AutoCAD LT drastically changes the enterprise game.

## The History: The Cost Barrier

Until recently, the primary selling point for the Full version of AutoCAD was not necessarily 3D modeling capability, but rather **API Support and Extensibility** (AutoLISP, .NET, ObjectARX).

If an engineering office had 15 designers who needed to run a simple "Block Quantitative" routine developed in-house, the BIM Manager was forced to approve the purchase of 15 expensive AutoCAD Full subscriptions, justifying the monstrous difference in price annually.

## What changes with AutoLISP in AutoCAD LT?

With the recent update, AutoCAD LT users have gained the superpower of loading `.lsp`, `.fas` and `.vlx` files.

> [!TIP]
> **What you CAN ALREADY do in AutoCAD LT:**
> * Load LISP routines (. lsp) that automate 2D drawings.
> * Use the `APPLOAD` command.
> * Create custom shortcuts based on routines.

> [!WARNING]
> **What AutoCAD LT CANNOT YET do:**
> * Run complex plugins in native `.NET` (DLLs) or `ObjectARX`.
> * LISP routines that invoke complex 3D commands or rendering (as the LT engine lacks the full *Solid Modeler*).

## The New Challenge: Distribution of Corporate Tools

The release generated an unexpected side effect: dozens of offices that previously did not use LISP due to technical limitations are now flooding their local servers with routines downloaded from the internet for the entire team. This created a management and security nightmare (the chaos of macro versions and viruses).

### The LispCentral Solution

This is where the transition from an "isolated cadre" to **corporate management** becomes necessary.

If you have 20 designers using AutoCAD LT and you have just purchased/developed an *Architecture Suite* in LISP, how do you ensure that everyone uses the same version and no one copies the file home?

**LispCentral** lets you take control. Instead of sending the LISP file by email, you upload it to our Cloud platform. LispCentral works as a connector (JIT Compiler): the AutoCAD LT user clicks the button, and the cloud delivers the routine directly to the machine's RAM, encrypted.

## Frequently Asked Questions (FAQ)

### 1. Does AutoCAD LT 2022 or 2023 run LISP?
Not natively. Autodesk has officially released the functionality starting with AutoCAD LT 2024. Previous versions of LT remain blocked for AutoLISP automation.

### 2. Will old AutoLISP routines run in the new AutoCAD LT?
In the vast majority of cases, yes. As long as the routine manipulates 2D entities (Lines, Polylines, Circles, Text, Blocks) or extracts data (Attributes, DXF), it will rotate perfectly. If the routine invokes `3DSOLID` modeling, it fails.

### 3. Can I use the LispCentral platform on my AutoCAD LT?
Yes! LispCentral's "Loader" was designed to be universal and runs natively on the new AutoCAD LT, allowing offices with mixed licenses (Full and LT) to use the same cloud Hub to manage their automations.