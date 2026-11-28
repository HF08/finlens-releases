# FinLens Domain Glossary

## Knowledge category

The knowledge library has exactly three categories:

- **finance**: the card's primary object is a financial asset, contract, institution, financing relation, valuation, insurance, investment, market-pricing relation, or financial risk.
- **background**: the card's primary object is an external condition, real-economy activity, law, technology, industry, consumer trend, science, governance role, or enforcement procedure.
- **method**: the card's primary object is a repeatable analytical procedure with assumptions, inputs, transformations, outputs, interpretation rules, and boundaries.

## Main explanatory object

The object that the card primarily defines or explains. Article topic, publication type, incidental financial consequences, and the model's initial label do not determine the main explanatory object.

## Positive evidence

Direct evidence that the main explanatory object belongs to a category. Finance requires financial-ontology evidence. Method requires complete-procedure evidence. Background is the default when neither is present.

## Revalidation evidence

The category-revalidation preview separates concrete snippets from `one` and `body` into main-object evidence, independent cross-category evidence, and explicit negative evidence. Card text is used only for consistency checking. Independent classification comes from a model conclusion plus at least two distinct, verified external sources explicitly selected by that model. Rule names, card text, source directories, duplicate URLs, and unselected search results are not independent source votes.

## Independent source vote

One verified external search result selected by the independent model for the target primary category. It must have a valid URL, exist in the current research result set, be unique by URL, and be explicitly cited by the model. Two independent source votes are required before a category change can be proposed automatically.

## Model conflict

The independent model's primary category differs from the local rule candidate. A model conflict is a review state, not source insufficiency, and cannot be automatically applied.

## Financial consequence

A financial effect caused by a background object. A financial consequence may justify a `background + finance` cross-link when it is material, but does not turn the background object itself into a finance term.

## Method procedure

A transferable reasoning procedure satisfying all six checks: purpose, assumptions, inputs, transformation, output/interpretation, and boundaries. It also requires `cardType=method` and at least two executable method steps.

## Mechanism

A causal path, transmission channel, or institutional operating logic. Mechanism is a card type, not a category, and never implies method by itself.

## Cross-listed category

A second category that independently and materially applies to the same card. A cross-link requires one primary category and at most one secondary category.

## Negotiation leverage

The relative advantage one party can use to shape negotiated terms. It is a background concept, and the word `leverage` does not imply financial leverage.

## External-condition risk premium

A pricing compensation demanded because of a named external condition such as geopolitical, political, or regulatory risk. When the card explains the pricing compensation, finance is primary and background is cross-listed; without recognizable pricing evidence, the card remains background.

## Priced financial premium

A financial measure whose primary object is itself a market pricing quantity, such as equity risk premium, term premium, liquidity premium, or credit spread. It is finance unless the card primarily explains a background condition instead of the pricing measure.

## Financial valuation procedure

A financial valuation object that also contains a complete transferable calculation and comparison procedure. Relative valuation is finance with a method cross-link when comparable selection, normalized inputs, multiple calculation, risk checks, and boundaries are all explicit.

## Learning focus

The user's chosen emphasis for an article's learning layer: balanced, IELTS, TOEFL, or finance. It changes both selected vocabulary and paragraph analysis; it never rewrites the source text or translation.

## Focus refresh

An atomic replacement of an article's vocabulary override and paragraph-analysis override for one learning focus. Both outputs must be valid before either is committed.

## Divorce asset division

A family-law and property-law mechanism that determines ownership and allocation under marital-property rules, marital agreements, trusts, and court remedies. It is background by default. Finance is cross-listed only when the card independently analyzes financial assets, valuation, liquidity, control, tax, or securities disclosure.

## Jointly controlled equity stake

An equity interest in a company whose voting, investment, sale, and disposal rights are shared through spousal, trust, or governance arrangements. The equity asset is the main financial object; the legal control structure is the background cross-link.

## Learning event

An append-only record of a learning action on a calendar date, such as completing an article, starting an article review, learning a word for the first time, or reviewing a word. Daily history, plan completion and heatmaps are derived from events instead of mutable counters.

## Study plan

A date-specific list of article read/review items plus target counts and a note. Planned item completion is derived from matching learning events; the plan does not store a separate completed flag.

## Background task

A persistent operation tracked through queued, running, success, failed or cancelled states. Annotation, focus batch refresh, AI summary, knowledge-card revalidation, crawling and mind-map generation use the same task lifecycle.

## Mind map

A normalized tree that represents an article as thesis, arguments, evidence and implications. Nodes may cite source paragraph numbers, and generated maps are cached per article without changing the source text.

See [Knowledge Classification Decision Framework](docs/knowledge-classification-decision-framework.md) for the full decision procedure.
