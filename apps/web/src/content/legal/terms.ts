/**
 * The shop's terms, the complaints procedure included (the `{{complaintsAnchor}}` section).
 * A DRAFT written from the Czech Civil Code for a small shop of originals paid by bank transfer;
 * have it checked before the shop opens. `{{…}}` are filled in by `fillLegalText` (lib/legal.ts).
 * A change to what the customer agrees to needs a new `TERMS_VERSION` (packages/domain seller.ts).
 */

const cs = `
## 1. Úvodní ustanovení {#uvod}

Tyto obchodní podmínky upravují prodej zboží v internetovém obchodě na webu klotilda.cz (dále jen „e-shop“) a vzájemná práva a povinnosti prodávající a kupujícího.

**Prodávající:**
{{sellerName}}
IČO: {{sellerIco}}
Sídlo: {{sellerAddress}}
{{sellerRegistration}}
E-mail: [{{sellerEmail}}](mailto:{{sellerEmail}})
Telefon: {{sellerPhone}}

Kupující je spotřebitel, nebo podnikatel, který nakupuje v rámci své podnikatelské činnosti. Ustanovení o odstoupení od smlouvy a o právech z vadného plnění ve prospěch spotřebitele se na kupujícího-podnikatele nevztahují, pokud to zákon nestanoví jinak.

Smlouva se uzavírá v českém jazyce. Práva a povinnosti neupravené těmito podmínkami se řídí českým právem, zejména zákonem č. 89/2012 Sb., občanský zákoník, a zákonem č. 634/1992 Sb., o ochraně spotřebitele.

## 2. Zboží

Nabízené zboží — keramika, výšivky, linoryty a další drobnosti — je ručně vyráběné, většinou v jediném kuse. Fotografie zboží jsou ilustrační v tom smyslu, že barvy se mohou na různých obrazovkách mírně lišit. Drobné odchylky ve tvaru, barvě nebo glazuře jsou u ruční výroby přirozené a nejsou vadou.

Zboží je v nabídce, dokud je skladem. Počet kusů skladem e-shop ukazuje u každého zboží.

## 3. Objednávka a uzavření smlouvy

Objednávku kupující vytvoří v e-shopu: vloží zboží do košíku, vyplní kontaktní a doručovací údaje, zvolí způsob dopravy a v posledním kroku potvrdí, že se seznámil s těmito obchodními podmínkami. Před odesláním může objednávku zkontrolovat a údaje opravit.

Odesláním objednávky tlačítkem „Objednat s povinností platby“ kupující činí závazný návrh smlouvy. Smlouva je uzavřena v okamžiku, kdy e-shop objednávku přijme; přijetí potvrdí prodávající e-mailem na adresu kupujícího. Zboží je od přijetí objednávky pro kupujícího rezervované.

Prodávající může objednávku zrušit, pokud ji kupující nezaplatí ve lhůtě podle článku 4, nebo pokud zboží nelze dodat (např. se poškodilo); kupujícímu v takovém případě vrátí vše, co zaplatil.

## 4. Cena a platba

Ceny v e-shopu jsou konečné. Prodávající není plátcem DPH. Cena dopravy se připočítává podle zvoleného způsobu:

- Zásilkovna: {{priceZasilkovna}} Kč
- Česká pošta: {{priceCeskaPosta}} Kč
- Osobní odběr v Praze: zdarma

Kupující platí bankovním převodem na účet prodávající, s variabilním symbolem objednávky; číslo účtu, částku a QR kód pro platbu dostane po odeslání objednávky na obrazovce i e-mailem. Cena je splatná do 7 dnů od uzavření smlouvy. Nezaplacenou objednávku může prodávající po uplynutí této lhůty zrušit a zboží vrátit do nabídky.

Doklad o zakoupení vystaví prodávající po zaplacení a pošle jej kupujícímu e-mailem.

## 5. Dodání

Zboží prodávající odešle zpravidla do 5 pracovních dnů od připsání platby na účet. O odeslání informuje kupujícího e-mailem, u Zásilkovny a České pošty s číslem zásilky pro sledování.

Při osobním odběru se prodávající s kupujícím domluví na místě a čase převzetí v Praze e-mailem.

Kupující by měl zásilku při převzetí zkontrolovat. Je-li obal zjevně poškozený, doporučujeme zásilku nepřevzít, nebo poškození zapsat do protokolu u dopravce. Nebezpečí škody na zboží přechází na kupujícího převzetím zboží.

## 6. Odstoupení od smlouvy {#odstoupeni}

Spotřebitel může od smlouvy odstoupit bez udání důvodu do **14 dnů** od převzetí zboží. Stačí, když v této lhůtě odešle prodávající oznámení o odstoupení — e-mailem na [{{sellerEmail}}](mailto:{{sellerEmail}}), dopisem na adresu sídla, nebo s využitím [formuláře pro odstoupení]({{withdrawalPath}}).

Zboží kupující vrátí do 14 dnů od odstoupení na adresu, kterou mu prodávající sdělí. Zboží má být nepoškozené, nepoužívané a pokud možno v původním obalu. **Náklady na vrácení zboží nese kupující.** Za snížení hodnoty zboží v důsledku nakládání s ním jinak, než je nutné k seznámení se s ním, odpovídá kupující.

Prodávající vrátí kupujícímu do 14 dnů od odstoupení všechny přijaté peníze, včetně ceny nejlevnějšího nabízeného způsobu dopravy, stejným způsobem, jakým je přijal (převodem na účet). Peníze nemusí vrátit dříve, než zboží obdrží nebo než kupující prokáže, že je odeslal.

Od smlouvy nelze odstoupit u zboží vyrobeného podle přání kupujícího nebo přizpůsobeného jeho osobním potřebám (§ 1837 písm. d) občanského zákoníku), pokud byla taková zakázka výslovně sjednána.

## 7. Práva z vadného plnění a reklamace {#{{complaintsAnchor}}}

Prodávající odpovídá kupujícímu, že zboží při převzetí nemá vady. Spotřebitel může vadu vytknout (reklamovat) do **24 měsíců** od převzetí zboží. Vada, která se projeví do jednoho roku od převzetí, se považuje za vadu, kterou zboží mělo již při převzetí.

Vadou nejsou drobné odchylky typické pro ruční výrobu (článek 2), ani opotřebení nebo poškození způsobené běžným užíváním, nevhodným zacházením či péčí v rozporu s popisem zboží.

### Jak reklamovat

1. Napište na [{{sellerEmail}}](mailto:{{sellerEmail}}): číslo objednávky (variabilní symbol), o jaké zboží jde, popis vady a nejlépe i fotografii.
2. Prodávající vám bez zbytečného odkladu potvrdí přijetí reklamace, se dnem jejího uplatnění, a domluví se s vámi, zda a kam zboží poslat.
3. Reklamaci prodávající vyřídí nejpozději do **30 dnů** od jejího uplatnění, pokud se nedohodnete na delší lhůtě, a o vyřízení vám vydá písemné potvrzení.

### Co můžete požadovat

Kupující může požadovat odstranění vady opravou nebo dodáním nové věci; to však u originálů, které existují v jediném kuse, zpravidla není možné. Není-li to možné, nebo prodávající vadu neodstraní v přiměřené době, má kupující právo na přiměřenou slevu z ceny, nebo — jde-li o podstatnou vadu — může od smlouvy odstoupit a dostane zpět zaplacenou cenu. Účelně vynaložené náklady spojené s oprávněnou reklamací (např. poštovné) prodávající kupujícímu uhradí.

## 8. Mimosoudní řešení sporů a dozor

Spor ze smlouvy může spotřebitel řešit mimosoudně u České obchodní inspekce (Štěpánská 567/15, 120 00 Praha 2, [adr.coi.cz](https://adr.coi.cz)). Návrh lze podat nejpozději do jednoho roku od uplatnění práva u prodávající.

Dozor nad dodržováním povinností prodávající vykonává Česká obchodní inspekce a v rozsahu živnostenského oprávnění příslušný živnostenský úřad.

## 9. Osobní údaje

Jak prodávající zpracovává osobní údaje kupujících, popisují [zásady ochrany osobních údajů]({{privacyPath}}).

## 10. Závěrečná ustanovení

Prodávající může tyto obchodní podmínky měnit. Na objednávku se vždy použijí podmínky ve znění platném v okamžiku jejího odeslání; to znění dostane kupující v potvrzení objednávky odkazem a může si je na této stránce uložit nebo vytisknout.

Tyto obchodní podmínky platí od {{effectiveFrom}}.
`;

const en = `
> This is a translation for convenience. The contract is made in Czech, and the [Czech version](/cs{{termsPath}}) of these terms is the binding one.

## 1. Introduction {#uvod}

These terms govern the sale of goods in the online shop at klotilda.cz (the "shop") and the rights and duties of the seller and the buyer.

**Seller:**
{{sellerName}}
Company ID (IČO): {{sellerIco}}
Registered address: {{sellerAddress}}
A sole trader under the Czech Trade Licensing Act
E-mail: [{{sellerEmail}}](mailto:{{sellerEmail}})
Phone: {{sellerPhone}}

The buyer is a consumer, or a business buying in the course of its business. The provisions on withdrawal and on consumer rights for defective goods do not apply to a business buyer unless the law says otherwise.

The contract is concluded in Czech and governed by Czech law, in particular the Civil Code (Act No. 89/2012 Coll.) and the Consumer Protection Act (Act No. 634/1992 Coll.).

## 2. Goods

The goods — ceramics, embroidery, linocuts and other small things — are handmade, mostly as one of a kind. Colours may look slightly different on different screens. Small variations in shape, colour or glaze are natural to handmade work and are not defects.

Goods are on offer while in stock; the shop shows how many pieces are left.

## 3. Order and contract

The buyer places an order in the shop: puts goods in the cart, fills in contact and delivery details, chooses shipping and, in the last step, confirms having read these terms. Before sending, the buyer can check the order and correct any details.

By sending the order with the "Order with obligation to pay" button, the buyer makes a binding offer. The contract is concluded when the shop accepts the order; the seller confirms this by e-mail. From then on the goods are reserved for the buyer.

The seller may cancel an order that is not paid within the period in article 4, or that cannot be delivered (for instance because the piece was damaged); the buyer then gets back everything paid.

## 4. Price and payment

Prices in the shop are final. The seller is not a VAT payer. Shipping is added according to the chosen method:

- Zásilkovna (Packeta): {{priceZasilkovna}} CZK
- Czech Post: {{priceCeskaPosta}} CZK
- Pickup in Prague: free

The buyer pays by bank transfer to the seller's account, with the order's variable symbol; the account number, the amount and a QR payment code are shown after the order is sent and e-mailed to the buyer. The price is due within 7 days of the contract. After that the seller may cancel an unpaid order and offer the goods again.

The seller issues a receipt once the order is paid and e-mails it to the buyer.

## 5. Delivery

The seller usually ships within 5 working days of the payment arriving, and e-mails the buyer when the parcel is on its way — for Packeta and Czech Post with a tracking number.

For a pickup, the seller and the buyer agree on the place and time in Prague by e-mail.

The buyer should check the parcel on delivery. If the packaging is visibly damaged, we recommend refusing it or having the damage recorded by the carrier. The risk of damage passes to the buyer on receipt of the goods.

## 6. Withdrawal from the contract {#odstoupeni}

A consumer may withdraw from the contract without giving a reason within **14 days** of receiving the goods. It is enough to send the seller a notice within that time — by e-mail to [{{sellerEmail}}](mailto:{{sellerEmail}}), by post to the registered address, or using the [withdrawal form]({{withdrawalPath}}).

The buyer returns the goods within 14 days of withdrawing, to the address the seller gives. The goods should be undamaged, unused and ideally in their original packaging. **The buyer bears the cost of returning the goods.** The buyer is liable for any loss of value caused by handling the goods beyond what is needed to examine them.

The seller refunds everything received, including the cheapest shipping offered, within 14 days of the withdrawal, the same way it was paid (bank transfer). The seller need not refund before receiving the goods or proof that they were sent.

There is no right of withdrawal for goods made to the buyer's specification or clearly personalised (Section 1837(d) of the Civil Code), where such a commission was expressly agreed.

## 7. Defective goods and complaints {#{{complaintsAnchor}}}

The seller is responsible for the goods being free of defects on receipt. A consumer may make a complaint within **24 months** of receiving the goods. A defect that appears within one year of receipt is presumed to have existed at receipt.

Small variations typical of handmade work (article 2), and wear or damage from normal use, mishandling or care contrary to the product description, are not defects.

### How to complain

1. Write to [{{sellerEmail}}](mailto:{{sellerEmail}}) with the order number (variable symbol), the item, a description of the defect and, ideally, a photo.
2. The seller confirms receipt of the complaint without undue delay, with the date it was made, and agrees with you whether and where to send the item.
3. The seller settles the complaint within **30 days** of it being made, unless you agree on longer, and confirms the outcome in writing.

### What you can ask for

The buyer may ask for the defect to be repaired or the item replaced; for one-of-a-kind originals this is usually not possible. If it isn't, or the seller does not remedy the defect in reasonable time, the buyer is entitled to a reasonable discount or — for a material defect — may withdraw from the contract and get the price back. The seller reimburses reasonable costs of a justified complaint (such as postage).

## 8. Out-of-court disputes and supervision

A consumer may settle a dispute out of court through the Czech Trade Inspection Authority (Štěpánská 567/15, 120 00 Prague 2, [adr.coi.cz](https://adr.coi.cz)), within one year of first raising the claim with the seller.

The Czech Trade Inspection Authority supervises the seller's duties, and the trade licensing office within the scope of the trade licence.

## 9. Personal data

How the seller processes buyers' personal data is described in the [privacy policy]({{privacyPath}}).

## 10. Final provisions

The seller may change these terms. An order is always governed by the terms in force when it was sent; the order confirmation links to them, and they can be saved or printed from this page.

These terms apply from {{effectiveFrom}}.
`;

export const TERMS = { cs, en };
