// ==UserScript==
// @name         Download DB Executions Info as JSON
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Extracts DB names and executions, then downloads them as JSON (for DB Monitoring page in AppDynamics).
// @author       You
// @include      *://*.appdynamics.com/*
// @include      http://10.62.160.115:8090/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const BUTTON_ID = 'tm-download-db-btn';

  function extractDate() {
    const dateInputs = document.querySelectorAll('input[id^="datefield-"][id$="-inputEl"]');
    const dateValues = Array.from(dateInputs)
      .map((input) => input.value?.trim())
      .filter(Boolean)
      .map((dateStr) => {
        const parts = dateStr.split(/[-/]/);
        if (parts.length === 3) {
          let [year, month, day] = parts;
          if (year.length === 4) {
            year = year.slice(2);
          } else if (day.length === 4) {
            [month, day, year] = parts;
            year = year.slice(2);
          }
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        return null;
      })
      .filter(Boolean);

    const uniqueDates = [...new Set(dateValues)].slice(0, 2);
    const titleValue = uniqueDates.join('_');
    const fallbackText = document.querySelector('.ads-time-range-selector-text.ng-binding')?.textContent.trim();

    return (titleValue || fallbackText || 'default_filename').replace(/[^a-zA-Z0-9-_]/g, '_');
  }

  function createDownloadButton() {
    if (document.getElementById(BUTTON_ID)) return;

    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.textContent = 'Download DB Info as JSON';

    const existingButtons = document.querySelectorAll('.tm-bottom-left-btn').length;
    const buttonOffset = existingButtons * 50 + 10;

    button.className = 'tm-bottom-left-btn';
    Object.assign(button.style, {
      position: 'fixed',
      bottom: `${buttonOffset}px`,
      left: '10px',
      zIndex: '9999',
      padding: '10px 15px',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    });

    button.addEventListener('click', () => {
      const cards = document.querySelectorAll('.ads-database-card');
      const results = [];

      cards.forEach((card) => {
        const dbNameEl = card.querySelector('.dbName[title]');
        const executionsEl = card.querySelector('.statsRow .value.ng-binding');

        const dbName = dbNameEl?.getAttribute('title')?.trim() || '';
        const executions = executionsEl?.textContent.trim() || '';

        if (dbName && executions) {
          results.push({ dbName, executions });
        }
      });

      if (results.length === 0) {
        alert('No database cards found.');
        return;
      }

      const jsonString = JSON.stringify(results, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const filename = `${extractDate()}.json`;

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

  function manageButtonVisibility() {
    const isOnTargetPage = window.location.href.includes('location=DB_MONITORING_SERVER_LIST');
    const existingBtn = document.getElementById(BUTTON_ID);

    if (isOnTargetPage && !existingBtn) {
      createDownloadButton();
    } else if (!isOnTargetPage && existingBtn) {
      existingBtn.remove();
    }
  }

  function observeURLChanges(callback) {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function () {
      originalPushState.apply(this, arguments);
      callback();
    };

    history.replaceState = function () {
      originalReplaceState.apply(this, arguments);
      callback();
    };

    window.addEventListener('popstate', callback);
  }

  // Initial run
  window.addEventListener('load', () => {
    setTimeout(manageButtonVisibility, 1000);
  });

  // React to SPA navigation
  observeURLChanges(() => {
    setTimeout(manageButtonVisibility, 1000);
  });
})();
