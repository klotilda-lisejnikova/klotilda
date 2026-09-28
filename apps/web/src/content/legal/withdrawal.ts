/**
 * The model withdrawal form (Government Regulation No. 363/2013 Coll., annex), with a short
 * how-to above it. `{{…}}` are filled in by `fillLegalText` (lib/legal.ts).
 */

const cs = `
Od smlouvy můžete do 14 dnů od převzetí zboží odstoupit bez udání důvodu (podrobnosti v [obchodních podmínkách]({{termsPath}}#odstoupeni)). Stačí nám napsat e-mail na [{{sellerEmail}}](mailto:{{sellerEmail}}) — nebo vyplnit tento formulář a poslat ho e-mailem či poštou. Uveďte prosím i číslo účtu, na který vám máme vrátit peníze.

## Oznámení o odstoupení od smlouvy

**Adresát:**
{{sellerName}}
{{sellerAddress}}
IČO: {{sellerIco}}
E-mail: {{sellerEmail}}

Oznamuji/oznamujeme (*), že tímto odstupuji/odstupujeme (*) od smlouvy o nákupu tohoto zboží:
______________________________________________

Číslo objednávky (variabilní symbol):
______________________________________________

Datum objednání (*) / datum obdržení (*):
______________________________________________

Jméno a příjmení spotřebitele/spotřebitelů:
______________________________________________

Adresa spotřebitele/spotřebitelů:
______________________________________________

Číslo účtu pro vrácení peněz:
______________________________________________

Podpis spotřebitele/spotřebitelů (pouze pokud je tento formulář zasílán v listinné podobě):
______________________________________________

Datum:
______________________________________________

(*) Nehodící se škrtněte nebo údaje doplňte.
`;

const en = `
You may withdraw from the contract without giving a reason within 14 days of receiving the goods (details in the [terms]({{termsPath}}#odstoupeni)). An e-mail to [{{sellerEmail}}](mailto:{{sellerEmail}}) is enough — or fill in this form and send it by e-mail or post. Please include the bank account for the refund.

## Notice of withdrawal from the contract

**To:**
{{sellerName}}
{{sellerAddress}}
Company ID (IČO): {{sellerIco}}
E-mail: {{sellerEmail}}

I/We (*) hereby give notice that I/we (*) withdraw from my/our (*) contract of sale of the following goods:
______________________________________________

Order number (variable symbol):
______________________________________________

Ordered on (*) / received on (*):
______________________________________________

Name of consumer(s):
______________________________________________

Address of consumer(s):
______________________________________________

Bank account for the refund:
______________________________________________

Signature of consumer(s) (only if this form is sent on paper):
______________________________________________

Date:
______________________________________________

(*) Delete as appropriate.
`;

export const WITHDRAWAL = { cs, en };
