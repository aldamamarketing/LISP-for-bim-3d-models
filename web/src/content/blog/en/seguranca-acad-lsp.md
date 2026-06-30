---
title: 'The Chaos of acad.lsp: How to manage and protect the Intellectual Property (IP) of your code'
description: 'Learn how AutoCAD viruses use acad.lsp and understand why storing LISP routines in network folders exposes your company to Intellectual Property theft.'
pubDate: 2026-05-28
heroImage: 'https://images.unsplash.com/photo-1510511459019-5efa32f5fb1b?q=80&w=1200&auto=format&fit=crop'
author: 'Equipe LispCentral'
tags: ["lisp programming", "acad lsp", "autocad lisp command"]
---**TL;DR:** Managing your LISP automation by spreading files across the company network via `acad.lsp` is an outdated model. In addition to the great vulnerability to macro viruses that destroy DWG files, the company's proprietary source code is exposed to theft on pen drives and offline intrusions. The market moves towards SaaS platforms (such as LispCentral), where the code resides on encrypted servers and runs via RAM injection (Zero-Disk).

Every experienced CAD/BIM Manager knows the value of well-constructed code. An AutoLISP routine capable of detailing stairs, structural metal profiles or extracting complex quantities represents tens of hours and thousands of dollars in research and development.

However, many companies treat this *Intellectual Property (IP)* in the worst possible way: saving the file `rotina-miraculosa.lsp` in the `Z:\Rede\CAD\` drive.

## The Fundamental Security Flaw of "acad.lsp"

When AutoCAD is started or when a new project (`.dwg`) is opened, it follows a checking routine. If a file named `acad.lsp` or `acaddoc.lsp` exists in the same directory as the project file, or on the network configured as *Support Path*, AutoCAD loads and executes this LISP code blindly.

> [!WARNING]
> **The AutoCAD Virus Attack Vector:**
> Hackers and early malware write "macro viruses" into AutoCAD using this flaw. The LISP virus copies itself to all network folders by infecting `acad.lsp` files. When opening the DWG, it blocks the `EXPLODE` or `BURST` commands, damaging the usability of the project until it is manually scanned.

### Why is NATIVE Encryption (.FAS/.VLX) not enough?

Autodesk offers a visual compilation tool (Make Application) that converts the text file `.lsp` into indecipherable binary files: `.fas` (Fast Load) or `.vlx` (Visual Lisp Executable).

This protects your "Trade Secret" against competitors reading your code, right? **Partially.**
Even if the malicious employee (or competitor) cannot "read" the source code of your `.vlx`, they can still **steal and execute the file**. If he copies the compiled file to the pen-drive and takes it to open his own company, the tool (which makes all of your company's automation profitable) will continue to work perfectly there.

## The Modern Market Answer: SaaS JIT Architecture

This is why technology companies stopped distributing CDs and started offering cloud services (Netflix vs Blockbuster).

The **LispCentral** platform brings this SaaS technology to AutoLISP, shielding your infrastructure with what we call **JIT (Just-In-Time) Compilation and Execution**.

**How your automation is 100% secure with LispCentral:**
1. You don't save LISPs on the local network. You register (upload) them on your LispCentral Panel via the web (high security Firebase Hosting).
2. Your employee uses AutoCAD with the **LispCentral Palette**. When he clicks on "Generate Pillar", the Palette sends an authentication request via Token (HTTPS).
3. The server checks: "Does this user have an active license and permission on your Dashboard?"
4. If yes, the server returns the LISP code back, and it is injected directly into AutoCAD's **RAM**.

The *LISP file never writes even a single byte to the hard drive* of the employee's local computer. If the employee leaves the company and you turn off his key on the LispCentral Panel, in the next second, nothing runs anymore. No corporate IPs were stolen.

## Frequently Asked Questions (FAQ)

### 1. My server has port blocking and Active Directory (AD). Are my LISPs on the network secure?
Against external hackers, perhaps. Against *internal threats* (the former employee with a pen drive/Google Drive copying the tools to open his own consultancy), no. The only way to shield internal threats is to remove local code from the equation.

### 2. What if AutoCAD does not have internet access when running LispCentral JIT?
LispCentral's architecture is based on the philosophy of **Online-Only Security**. In remote locations with absolutely no signal (construction sites isolated via satellite), the routine will not validate the session (to prevent cached version hijacking) and will not execute. The cost is negligible given the guarantee of inviolable IP.

### 3. How to clean a virus lodged in "acad.lsp" files?
Autodesk makes the **AutoCAD Security Tool** tool available for free in the App Store repository or simply blocking the system variable `ACADLSPASDOC=0` and the strict use of `SECURELOAD`. See our official documentation for technical mitigations.