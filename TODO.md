## Retain Raw Inputs - Quality

All forms of raw input should be retained somewhere. At a minimum, the untransformed fields should be retained for alternative uses in the JSON exports.

## Stricter Typing - Quality

Most fields are derived from table headers at the moment; if the table changes, so does the field. This causes a few problems:

- Fields could disappear in the future and will be overwritten.
- Fields could be renamed and not be automatically reconciled.
- Types within the fields are often inconsistent and no consideration is taken for this.

## Stricter Naming - Quality

Currently fields are renamed, but are not consistent in their use of acronyms or prefixes/suffixes. Standardize naming appropriately.

## Footnote Integration - Availability

Automatic handling of footnotes would be a nice-to-have for identifying unusual modifications to values.

## More Complicated Sources - Availability

Income and corporate tax coefficients, inclusion rates and other factors that are not provided in clean tables require self-extending data processors.

- Sources need to be identified (partially completed in README.md::Sources::Future)
- Processors need to be implemented.
- combiners::ensureExtend need to be tested with %CURRENT_YEAR% as an adjuvant.

## Multi-source Derived Data - Usability

A smaller number of JSON exports providing organized, joined data over appropriate keys (usually years) will improve usability considerably. For example, consider how `cpp.json` includes YMPE data, but so does `pensions.json`.

## Multi-format Derived Data - Usability

After updating the authoritative JSON files, we should also generate derived CSVs and perhaps a pipeline for other data formats. These will improve usability for non-web developers.

## Test Suite - Quality

Both a code quality assurance test suite and an ongoing data integrity test suite should be developed.
