// ==UserScript==
// @name         Manual Download App Info as JSON (AppDynamics Only)
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Adds a button to extract and download application titles and call stats as JSON, only on AppDynamics pages containing 'appdynamics' in the URL.
// @author       You
// @include      *://*.appdynamics.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  function extractDate() {
    const dateInputs = document.querySelectorAll(
      'input[id^="datefield-"][id$="-inputEl"]'
    );
    const dateValues = Array.from(dateInputs)
      .map((input) => input.value?.trim())
      .filter(Boolean)
      .map((dateStr) => {
        // Normalize to YY-MM-DD
        const parts = dateStr.split(/[-/]/); // Handles both "-" and "/" separators
        if (parts.length === 3) {
          let [year, month, day] = parts;

          // Handle both YYYY-MM-DD and MM/DD/YYYY formats
          if (year.length === 4) {
            year = year.slice(2); // Take last 2 digits
          } else if (day.length === 4) {
            // Likely MM/DD/YYYY
            [month, day, year] = parts;
            year = year.slice(2);
          }

          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        return null;
      })
      .filter(Boolean);

    // Use first 2 unique values
    const uniqueDates = [...new Set(dateValues)].slice(0, 2);
    const titleValue = uniqueDates.join('_');

    // Fallback
    const fallbackText = document
      .querySelector('.ads-time-range-selector-text.ng-binding')
      ?.textContent.trim();

    // Sanitize
    const sanitized = (
      titleValue ||
      fallbackText ||
      'default_filename'
    ).replace(/[^a-zA-Z0-9-_]/g, '_');
    return sanitized;
  }

  function createDownloadButton() {
    const button = document.createElement('button');
    button.textContent = 'Download App Info as JSON';

    // Count existing buttons with the shared class for stacking
    const existingButtons = document.querySelectorAll(
      '.tm-bottom-left-btn'
    ).length;
    const buttonOffset = existingButtons * 50 + 10;

    button.className = 'tm-bottom-left-btn';
    button.style.position = 'fixed';
    button.style.bottom = `${buttonOffset}px`;
    button.style.left = '10px';
    button.style.zIndex = '9999';

    button.style.padding = '10px 15px';
    button.style.backgroundColor = '#007bff';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

    button.addEventListener('click', () => {
      const cards = document.querySelectorAll(
        '.ads-application-card.ads-application-card-height-auto'
      );
      const results = [];

      cards.forEach((card) => {
        const titleEl = card.querySelector(
          '.ads-application-card-title-container'
        );
        const title = titleEl?.getAttribute('title') || '';

        const stats = card.querySelectorAll(
          '.ads-application-card-content .ads-application-card-stat'
        );
        const secondStat = stats[1]; // second one (index 1)
        const callsValue =
          secondStat
            ?.querySelector('.ads-application-card-stat-number.ng-binding')
            ?.textContent.trim() || '';

        results.push({ appName: title, calls: callsValue });
      });

      if (results.length === 0) {
        alert('No application cards found.');
        return;
      }

      const jsonString = JSON.stringify(results, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const extractedDate = extractDate().replace(/[^a-zA-Z0-9-_]/g, '_'); // Sanitize filename
      const filename = `${extractedDate}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    document.body.appendChild(button);
  }

  window.addEventListener('load', () => {
    if (window.location.href.includes('appdynamics')) {
      createDownloadButton();
    }
  });
})();
