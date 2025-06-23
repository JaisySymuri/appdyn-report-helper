# Appdyn Report Helper

A Tampermonkey userscript & Go app toolkit to streamline AppDynamics report extraction, analysis, and documentation.

## Overview

This project consists of:

1. **Appdyn Report Helper Userscript**  
   A [Tampermonkey](https://www.tampermonkey.net/) userscript that adds smart helper buttons to AppDynamics dashboards for:
   - One-click summary/copy of incident and BT health info.
   - Quick JSON export of Application, Database, and EUM data.
   - Context-aware UI: buttons only show on relevant pages.

2. **Go Report Comparison Tool**  
   A Go CLI app that reads, compares, and generates actionable instructions from the JSON files exported by the userscript.

Together, these tools make it much easier and faster to create, review, and update AppDynamics reports.

---

## 1. Userscript: Appdyn Report Helper

### Features

- **Incident Page**: Copy BT violation info in a report-ready format.
- **App Dashboard**: Copy BT health summary.
- **All Apps/DB/EUM Dashboards**: Download data as JSON (ready for analysis).
- **Smart Navigation**: Buttons appear/disappear as you navigate dashboards.
- **Instant Feedback**: Copy/download actions show toast notifications.

### Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) in your browser.
2. Create a new script, paste the contents of `Appdyn Report Helper.user.js`, and save.

### Usage

- Visit the relevant AppDynamics dashboard.
- Use the new buttons (bottom-left) to copy summaries or export data as JSON.
- The exported JSONs will be used by the Go comparison app.

---

## 2. Go Report Comparison Tool

### Features

- Reads exported JSON data from two directories (e.g. `old-Q` and `new-Q`).
- Detects and handles mismatched types automatically (e.g. app vs db).
- Compares old vs new data to:
  - Find new, changed, or deleted entries.
  - Print a summary and actionable instructions for updating reports.

### Usage

```sh
go run main.go
```
- Expects exported JSONs in `old-Q/` and `new-Q/`.
- Prints comparison results and update instructions to the console.

#### Example Output

```
✅ Comparison Summary:
- 2 new applications found.
- 1 application removed.
- 3 applications with changed call counts.

Instructions:
- Add the following to your report: ...
- Remove the following: ...
```

---

## Workflow Example

1. Use the userscript to export AppDynamics data before and after a change window (save to `old-Q/` and `new-Q/`).
2. Run the Go tool to compare, print changes, and generate update instructions for your report.

---

## Author

[Jaisy Symuri](mailto:jaisy.symuri@yourdomain.com)

---

*If you find this toolkit useful, please star or contribute!*
