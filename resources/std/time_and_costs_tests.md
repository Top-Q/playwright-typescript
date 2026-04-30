---
id: TAC-Log-Time
suite: Time and Costs
feature: Time logging
component: time-and-costs
priority: P1
tags: [ui, timeandcosts, regression]
variables:
  workPackageId: 2
  hours: "3"
  activity: "Development"
  comment: "Auto time entry <timestamp>"
---

Background:
  Given the user is authenticated as "default"
  And the user is on the Work Packages page

Scenario: Log time on a work package and verify it appears in the cost report
  When the user opens work package with id "<workPackageId>" detail view
  And the user logs <hours> hours of "<activity>" with comment "<comment>"
  And the user navigates to Time and Costs
  And the user removes the date filter
  And the user applies the cost report
  Then the cost report shows the logged time
  And the work package appears in the cost report

---
id: TAC-Empty-Report
suite: Time and Costs
feature: Cost reporting
component: time-and-costs
priority: P1
tags: [ui, timeandcosts, regression]
variables:
  futureDate: "2099-01-01"
---

Background:
  Given the user is authenticated as "default"
  And the user is on the Time and Costs page

Scenario: Cost report shows "nothing to display" when no time is logged in date range
  When the user sets the date filter to "<futureDate>"
  And the user applies the cost report
  Then the report shows "nothing to display"
  And the cost report table is hidden

---
id: TAC-Clear-Filters
suite: Time and Costs
feature: Cost reporting filters
component: time-and-costs
priority: P1
tags: [ui, timeandcosts, regression]
---

Background:
  Given the user is authenticated as "default"
  And the user is on the Time and Costs page

Scenario: Cost report Clear removes all filters and resets to blank state
  When the user clicks the Clear button
  Then all filters are removed
  And the report heading is "New cost report"
  And no group-by attributes are selected
