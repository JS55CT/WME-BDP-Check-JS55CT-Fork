# WME BDP Check (JS55CT Fork)

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

## Overview

This is a fork of the [WME BDP Check](https://github.com/WazeDev/WME-BDP-Check), a user script for the Waze Map Editor (WME) designed to check for possible "Backbone Detour Prevention" (BDP) routes between two selected segments. This fork introduces several modifications and improvements to enhance script functionality and usability.

## Major Changes

### Changes by [JS55CT](https://github.com/JS55CT)
- **Enhanced Road Type Continuity Check**: Improved the `rtgContinuityCheck` function to include better logging and more efficient road type validity checking.
- **Midpoint Calculation Accuracy**: Updated the `getMidpoint` function to increase the accuracy of midpoint calculations, ensuring better accuracy for alternate route detection.
- **Improved Alerts**: Added more detailed and informative user alerts for various operational conditions and outcomes.
- **Feature Box Selection Handling**: Updated event listeners for better handling of feature box selections.
- **General Code Refactoring**: Refactored code to improve readability and maintainability.

## Installation

To install the script, follow these steps:

1. **Install a User Script Manager**:
   - For [Tampermonkey](https://www.tampermonkey.net/):
     - Chrome: [Install from Chrome Web Store](https://chrome.google.com/webstore/detail/dhdgffkkebhmkfjojejmpbldmpobfkfo)
     - Firefox: [Install from Add-ons Market](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - For [Greasemonkey](https://www.greasespot.net/):
     - Firefox: [Install from Add-ons Market](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)

2. **Install the Script**:
   - Visit the following URL and click the install button:
     - [WME BDP Check (JS55CT Fork)](#) *(Replace with the actual `@downloadURL` that you will set)*

## Usage

1. Open the Waze Map Editor in your browser.
2. Select two or more segments on the map.
3. Click the “BDP Check” button that appears in the segment edit panel.
4. Choose to check using WME or Live Map (LM).
5. Follow the on-screen alerts and guidance to manage detected BDP routes.

## How It Works

### Conditions for BDP Checks
- **Road Types**: Only segments of specific road types (e.g., Minor Highway, Major Highway) are checked.
- **Street Name Continuity**: Segments must share a common street name for BDP applicability.
- **Road Type Groups**: Segments must belong to the same road type group.

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
