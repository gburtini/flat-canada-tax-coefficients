# Canadian Tax Coefficients

An automatically updating dataset of coefficients necessary for Canadian tax computations. Updated (at least) once a quarter.

## Data

| Data                 | Format                     | Processor                                 | Origin                                                                                                                                                                                       |
| -------------------- | -------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CPP coefficients     | [JSON](data/cpp.json)      | [cpp.ts](src/processors/cpp.ts)           | [1](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/canada-pension-plan-cpp/cpp-contribution-rates-maximums-exemptions.html) |
| Pension coefficients | [JSON](data/pensions.json) | [pensions.ts](src/processors/pensions.ts) | [1](https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html)                                                            |
| RRIF factors         | [JSON](data/rrif.json)     | [rrif.ts](src/processors/rrif.ts)         | [1](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/completing-slips-summaries/t4rsp-t4rif-information-returns/payments/chart-prescribed-factors.html)                |
| TFSA limits          | [JSON](data/tfsa.json)     | [tfsa.ts](src/processors/tfsa.ts)         | [1](https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html)                                                            |
| Personal tax rates   | [JSON](data/personal.json) | [personal.ts](src/processors/personal.ts) | [1](https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html)               |

## Sources

### Current

- [CPP contribution rates, maximums and exemptions](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/canada-pension-plan-cpp/cpp-contribution-rates-maximums-exemptions.html)
- [MP, DB, RRSP, DPSP, ALDA, TFSA limits and the YMPE](https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html)
- [Chart - Prescribed Factors](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/completing-slips-summaries/t4rsp-t4rif-information-returns/payments/chart-prescribed-factors.html)
- [MP, DB, RRSP, DPSP, ALDA, TFSA limits and the YMPE](https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html)
- [Federal and provincial rate data](https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html)

### Past

_No sources have been discontinued or superseded._

### Future

- [Corporation Tax Rates](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/corporation-tax-rates.html)
- [Indexation adjustment for personal income tax and benefit amounts](https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/adjustment-personal-income-tax-benefit-amounts.html)
- [Provincial rate data](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/provincial-territorial-tax-credits-individuals.html) currently accrued from the federal page.

## License

The source code here is proprietary for now, if you require a separate license or wish to work on or with this project's source code directly, please reach out. The data from Canada is collected under the terms from [Canada.ca](https://www.canada.ca/en/transparency/terms.html).
