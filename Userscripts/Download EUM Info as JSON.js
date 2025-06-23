// ==UserScript==
// @name         Download EUM Info as JSON
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds a button to extract "Name" and "Requests" from grid, only on the EUM Web All Apps dashboard.
// @author       You
// @include      *://*.appdynamics.com/*
// @include      http://10.62.160.115:8090/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const EUM_BUTTON_ID = 'tm-download-btn-eum';

  function extractDate() {
    const dateInputs = document.querySelectorAll(
      'input[id^="datefield-"][id$="-inputEl"]'
    );
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
    const fallbackText = document
      .querySelector('.ads-time-range-selector-text.ng-binding')
      ?.textContent.trim();

    return (titleValue || fallbackText || 'default_filename').replace(
      /[^a-zA-Z0-9-_]/g,
      '_'
    );
  }

  function createEUMINFODownloadButton() {
    if (document.getElementById(EUM_BUTTON_ID)) return;

    const button = document.createElement('button');
    button.id = EUM_BUTTON_ID;
    button.textContent = 'Download Grid Info as JSON';

    const existingButtons = document.querySelectorAll(
      '.tm-bottom-left-btn'
    ).length;
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
      const gridView = document.querySelector(
        '.x-grid-view.x-fit-item.x-grid-view-default.x-unselectable'
      );
      const rows = gridView?.querySelectorAll('table tr') || [];
      const results = [];

      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          const nameEl = cells[0].querySelector('span');
          const requestEl = cells[1].querySelector('.x-grid-cell-inner');

          const name = nameEl?.textContent.trim();
          const requestText =
            requestEl?.textContent.trim().replace(/,/g, '') || '0';
          const requests = parseInt(requestText, 10);

          if (name && requests > 0) {
            results.push({ name, requests });
          }
        }
      });

      if (results.length === 0) {
        alert('No matching data found.');
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
    const isOnTargetPage = window.location.href.includes(
      'location=EUM_WEB_ALL_APPS'
    );
    const existingBtn = document.getElementById(EUM_BUTTON_ID);

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

  window.addEventListener('load', () => {
    setTimeout(manageButtonVisibility, 1000);
  });

  observeURLChanges(() => {
    setTimeout(manageButtonVisibility, 1000);
  });
})();
