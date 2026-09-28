/**
 * The privacy policy (GDPR Art. 13). A DRAFT describing what the shop actually does — have it
 * checked, and keep it in step with the code: what the checkout collects, who processes it, how
 * long orders are kept. `{{…}}` are filled in by `fillLegalText` (lib/legal.ts).
 */

const cs = `
## Kdo vaše údaje zpracovává

Správcem osobních údajů je {{sellerName}}, IČO {{sellerIco}}, se sídlem {{sellerAddress}} (dále jen „prodávající“). S dotazy k osobním údajům pište na [{{sellerEmail}}](mailto:{{sellerEmail}}).

## Jaké údaje a proč

Když nakoupíte v e-shopu, zpracováváme údaje, které vyplníte v objednávce: jméno a příjmení, e-mail, telefon (pokud ho uvedete), doručovací adresu, obsah objednávky, poznámku k ní a údaje o platbě (částku a variabilní symbol).

- **Vyřízení objednávky** — uzavření a splnění kupní smlouvy, doručení, komunikace o objednávce, odstoupení a reklamace (čl. 6 odst. 1 písm. b) GDPR).
- **Účetní a daňové povinnosti** — doklady o prodeji (čl. 6 odst. 1 písm. c) GDPR).
- **Ochrana našich práv** — pro případ sporu z objednávky (čl. 6 odst. 1 písm. f) GDPR, oprávněný zájem).

Obchodní sdělení (newsletter) neposíláme a vaše údaje neprodáváme ani nepředáváme k marketingu.

## Jak dlouho

Údaje z objednávky uchováváme po dobu jejího vyřízení a dále po dobu, po kterou mohou vzniknout nároky ze smlouvy (zpravidla 4 roky od dodání). Údaje na účetních dokladech uchováváme po dobu stanovenou zákonem, nejdéle 10 let.

## Kdo k nim má přístup

Údaje zpracovává prodávající. Pro provoz e-shopu využíváme tyto zpracovatele, kteří s údaji smějí nakládat jen podle našich pokynů:

- **Vercel Inc.** — provoz webových stránek;
- **Railway Corporation** — provoz serveru a databáze s objednávkami;
- **Cloudflare, Inc.** — uložení fotografií zboží (osobní údaje neobsahují);
- **poskytovatel e-mailové schránky** — odesílání e-mailů k objednávce.

Dopravcům (Zásilkovna s.r.o., Česká pošta, s.p.) předáváme jméno, doručovací adresu, e-mail a telefon, aby vám mohli zásilku doručit.

Vercel, Railway a Cloudflare jsou americké společnosti; údaje mohou být zpracovány i mimo EU. Předání se opírá o rámec EU–USA pro ochranu osobních údajů (Data Privacy Framework), případně o standardní smluvní doložky schválené Evropskou komisí.

## Cookies a měření návštěvnosti

Web nepoužívá reklamní ani sledovací cookies, proto se vás na souhlas neptá. Obsah košíku si web ukládá ve vašem prohlížeči (localStorage), aby vám nezmizel; nikam se neodesílá, dokud neodešlete objednávku. Návštěvnost měříme nástrojem Vercel Web Analytics, který cookies nepoužívá a návštěvníky neidentifikuje.

## Vaše práva

Máte právo na přístup ke svým údajům, na jejich opravu nebo výmaz, na omezení zpracování, na přenositelnost údajů a právo vznést námitku proti zpracování založenému na oprávněném zájmu. Stačí napsat na [{{sellerEmail}}](mailto:{{sellerEmail}}).

Pokud se domníváte, že údaje zpracováváme v rozporu s předpisy, můžete podat stížnost u Úřadu pro ochranu osobních údajů ([uoou.gov.cz](https://uoou.gov.cz)).

Tyto zásady platí od {{effectiveFrom}}.
`;

const en = `
> This is a translation for convenience; the [Czech version](/cs{{privacyPath}}) is the binding one.

## Who processes your data

The controller of your personal data is {{sellerName}}, company ID (IČO) {{sellerIco}}, {{sellerAddress}} (the "seller"). For any question about your data, write to [{{sellerEmail}}](mailto:{{sellerEmail}}).

## What data and why

When you buy in the shop, we process what you fill in the order: first and last name, e-mail, phone (if given), delivery address, the order's content and note, and payment details (the amount and variable symbol).

- **Handling the order** — making and performing the purchase contract, delivery, communication about the order, withdrawals and complaints (Art. 6(1)(b) GDPR).
- **Accounting and tax duties** — records of the sale (Art. 6(1)(c) GDPR).
- **Protecting our rights** — in case of a dispute over an order (Art. 6(1)(f) GDPR, legitimate interest).

We send no newsletters, and we neither sell your data nor pass it on for marketing.

## How long

We keep order data while the order is handled and then for as long as claims under the contract may arise (usually 4 years after delivery). Data on accounting records is kept for the period the law requires, at most 10 years.

## Who can see it

The seller processes the data. To run the shop we use these processors, who may handle the data only on our instructions:

- **Vercel Inc.** — hosting the website;
- **Railway Corporation** — hosting the server and the order database;
- **Cloudflare, Inc.** — storing product photos (no personal data);
- **our e-mail provider** — sending the order e-mails.

Carriers (Zásilkovna s.r.o., Česká pošta, s.p.) receive your name, delivery address, e-mail and phone so they can deliver the parcel.

Vercel, Railway and Cloudflare are US companies; data may be processed outside the EU. Such transfers rely on the EU–US Data Privacy Framework or on standard contractual clauses approved by the European Commission.

## Cookies and analytics

The site uses no advertising or tracking cookies, so it doesn't ask for consent. Your cart is kept in your browser (localStorage) so it doesn't disappear; it is sent nowhere until you place an order. We count visits with Vercel Web Analytics, which uses no cookies and does not identify visitors.

## Your rights

You have the right to access your data, to have it corrected or erased, to restrict its processing, to data portability, and to object to processing based on legitimate interest. Just write to [{{sellerEmail}}](mailto:{{sellerEmail}}).

If you believe we process your data unlawfully, you may complain to the Czech Office for Personal Data Protection ([uoou.gov.cz](https://uoou.gov.cz)).

This policy applies from {{effectiveFrom}}.
`;

export const PRIVACY = { cs, en };
