# WME BDP Check (JS55CT Fork)

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

## Overview

This is a fork of the [WME BDP Check from the WazeDev team](https://github.com/WazeDev/WME-BDP-Check), a user script for the Waze Map Editor (WME) designed to check for possible "Backbone Detour Prevention" (BDP) routes between two selected segments. This fork introduces several modifications and improvements to enhance script functionality and usability.

## Major Changes

### Changes by [JS55CT](https://github.com/JS55CT)
- **Enhanced Road Type Continuity Check**: Improved the `rtgContinuityCheck` function to include better logging and more efficient road type validity checking.
- **Midpoint Calculation Accuracy**: Updated the `getMidpoint` function to increase the accuracy of midpoint calculations, ensuring better accuracy for alternate route detection.
- **Improved Alerts**: Added more detailed and informative user alerts for various operational conditions and outcomes.
- **Feature Box Selection Handling**: Updated event listeners for better handling of feature box selections.
- **General Code Refactoring**: Refactored code to improve readability and maintainability.

## Installation

To install this user script, you need to have a userscript manager installed in your browser (such as Tampermonkey or Greasemonkey).

### Tampermonkey (Recommended)

1. **Install Tampermonkey**:
   - [Tampermonkey for Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Tampermonkey for Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/)
   - [Other browsers](https://www.tampermonkey.net/)

2. **Add the Script via URL**:
   - **Open the Tampermonkey dashboard** by clicking on the Tampermonkey icon in your browser toolbar and selecting "Dashboard".
   - In the dashboard, click on the tab that says "Utilities".
   - In the "Import from URL" section, paste the following URL:
     ```
     https://raw.githubusercontent.com/JS55CT/WME-BDP-Check-JS55CT-Fork/main/WME-BDP-Check.js
     ```
   - Click on the "Import" button.
   - You will be directed to a page that shows the script. Click the "Install" button.

## Usage

1. Open the Waze Map Editor in your browser.
2. Select two or more segments on the map.
3. Click the “BDP Check” button that appears in the segment edit panel.
4. Choose to check using WME or Live Map (LM).
5. Follow the on-screen alerts and guidance to manage detected BDP routes.

## How It Works

### Conditions for BDP Checks
- **Road Types**: Only segments of specific road types are checked. Road types need to be within Minor Highway, Major Highway, and Freeway categories.
- **Street Name Continuity**: Segments must share a common street name for BDP applicability.
- **Road Type Groups (RTG)**: Segments must belong to the same road type group (Minor Highway or Major Highway and Freeways). The script distinguishes:
- **Selection Continuity**: When selecting more than two segments, the selected segments must form a continuous route.
- **One-Way Segments**: Only one-way segments where the turn is allowed based on the segment direction and node directionality will be considered in the checks.
- **Segment Types**: Selection must not include segments of unrouteable types such as Railroads, Runways, Private Roads, Off-Road, etc.
- **Length Constraints**: The total length of alternate routes checked must be within maximum allowed limits:
- **Detour Length**: Detours must contain at least two segments with a total length less than 500 meters for Minor Highways and less than 5000 meters for Major Highways and Freeways.

### Alerts and Warnings
- Informative alerts on continuity checks, direct route finds, and BDP applicability.
- Warnings for invalid selections and non-applicable road types.

## Acknowledgements

- **Original Author**: dBsooner
  - [Original Repository](https://github.com/WazeDev/WME-BDP-Check)
  - [GreasyFork Profile](https://greasyfork.org/en/users/166843)

## License

This project is licensed under the GNU General Public License v3.0. For more details, see the [LICENSE](LICENSE) file.

## Contact

For any issues, suggestions, or contributions, please open an issue on this [GitHub repository](https://github.com/JS55CT/WME-BDP-Check-JS55CT-Fork-) or reach out to [JS55CT](https://github.com/JS55CT).
