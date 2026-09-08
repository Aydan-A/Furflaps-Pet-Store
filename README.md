# FurFlaps — Shopify Storefront

A custom Shopify storefront for **FurFlaps**, a pet accessories brand focused on personalized collars, letter charms, decorative accessories, and playful pet products.

Built on **Shopify Dawn 15.5.0**, the project combines custom theme development, Figma-led design, Shopify-native architecture, and merchant-editable sections.

## Overview

FurFlaps started from Shopify's Dawn theme and was extended with:

* Custom Shopify sections and snippets
* Product-selection flows
* Product personalization
* AJAX cart interactions
* Responsive layouts
* Custom storefront interactions
* Merchant-editable Theme Editor settings

The storefront was designed in **Figma**, with layout, responsiveness, interactions, and merchant controls refined during development.

## Base Theme

* **Theme:** Shopify Dawn
* **Version:** 15.5.0
* **Platform:** Shopify Online Store 2.0

The project preserves Dawn's core architecture where practical while extending or replacing components when the storefront design or product experience requires custom behavior.

## Development Approach

The storefront uses a hybrid development approach:

* Custom sections and snippets built on top of Dawn
* Existing Dawn components customized where needed
* Shopify-native sections, blocks, settings, metafields, and product data
* Vanilla JavaScript with Web Components
* No frontend framework
* No separate build pipeline

Key customizations include:

* Product variant picker improvements
* Swatch fallback handling
* Product disclosures
* Cart drawer updates
* Cart line-item rendering
* AJAX cart behavior
* Product card customization
* Header and footer customization

## Design Workflow

The storefront was designed in **Figma** and translated into Shopify while preserving merchant flexibility.

Reusable design decisions were converted into Theme Editor settings instead of being fully hardcoded.

Examples include:

* Section spacing
* Desktop and mobile typography
* Content alignment
* Card ratios
* Colors
* Layout options
* Product selections
* Section-specific content
* Responsive behavior

This keeps the storefront aligned with the original design while remaining manageable from Shopify Admin.

## Tech Stack

* Shopify
* Shopify Online Store 2.0
* Dawn 15.5.0
* Liquid
* HTML
* CSS
* Vanilla JavaScript
* Web Components
* JSON templates
* Shopify Sections
* Shopify Blocks
* Shopify Theme Editor
* Shopify Metafields
* Shopify Metaobjects
* Shopify AJAX Cart API
* Shopify Section Rendering API
* Shopify CLI
* Git
* GitHub
* Figma

## Responsive Development

The storefront is built for:

* Desktop
* Laptop
* Tablet
* Mobile

Custom responsive behavior follows Dawn's breakpoint conventions, including:

```text
479px
749px
989px
```

Responsive work includes layout, typography, spacing, product cards, sections, and interaction behavior across screen sizes.

## Shopify Theme Editor

Custom storefront sections are designed to remain merchant-editable.

Section schemas provide controls for:

* Text content
* Labels
* Colors
* Typography
* Desktop font sizes
* Mobile font sizes
* Images
* Products
* Collections
* Card ratios
* Section spacing
* Alignment
* Layout
* Selection limits
* Builder step configuration

## Development Principles

When extending the storefront:

* Preserve Shopify-native functionality where possible
* Keep merchant-editable content inside section settings
* Avoid unnecessary hardcoded content
* Reuse existing components before creating duplicates
* Keep Liquid, CSS, and JavaScript maintainable
* Test changes across responsive breakpoints
* Preserve accessibility
* Avoid unnecessary third-party dependencies
* Verify product and cart behavior after storefront changes
* Keep custom code compatible with Shopify Theme Editor

## Project Focus

This project demonstrates:

* Shopify theme development
* UX/UI implementation
* Figma-to-Shopify workflow
* Custom section architecture
* Product personalization
* AJAX cart development
* Responsive storefront engineering
