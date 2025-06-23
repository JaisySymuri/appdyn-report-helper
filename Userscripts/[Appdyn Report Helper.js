// ==UserScript==
// @name         Appdyn Report Helper
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Helps making Appdynamic Report easier
// @author       Jaisy Symuri
// @include      *://*.appdynamics.com/*
// @include      http://10.62.160.115:8090/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // --- Common Helpers ---
  // --- SPA observer ---
  function observeURLChanges(callback) {
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;
    history.pushState = function () {
      originalPush.apply(this, arguments);
      callback();
    };
    history.replaceState = function () {
      originalReplace.apply(this, arguments);
      callback();
    };
    window.addEventListener('popstate', callback);
  }

  // --- Init ---
  function init() {
    const isIncidentPage = window.location.href.includes(
      'location=APP_INCIDENT_DETAIL_MODAL'
    );
    const isAppDashboard = window.location.href.includes(
      'location=APP_DASHBOARD'
    );
    const isAllAppsDashboard = window.location.href.includes(
      'location=APPS_ALL_DASHBOARD'
    );
    const isAllDBDashboard = window.location.href.includes(
      'location=DB_MONITORING_SERVER_LIST'
    );

    const isEUMDashboard = window.location.href.includes(
      'location=EUM_WEB_ALL_APPS'
    );

    // Incident Detail Page: BT/Node violation button
    if (isIncidentPage) {
      waitForElement('[ng-bind-html="controller.summaryDetails"]')
        .then(createBTViolationButton)
        .catch(console.warn);
    }

    // Application Dashboard Page: BT Summary button
    if (isAppDashboard) {
      waitForElement('.ads-health-bar-component-summary p')
        .then(createBTHealthSummaryButton)
        .catch(console.warn);
    }

    // All Applications Dashboard Page: JSON Download button
    if (isAllAppsDashboard) {
      waitForElement('.ads-application-card.ads-application-card-height-auto')
        .then(createAppInfoAsJSONDownloadButton)
        .catch(console.warn);
    }

    // All Database Dashboard Page: JSON Download button
    if (isAllDBDashboard) {
      waitForElement('ad-all-dbs-base > div')
        .then(createDBInfoAsJSONDownloadButton)
        .catch((e) => console.warn('DB base not found:', e));
    }

    // EUM Dashboard Page: JSON Download button
    if (isEUMDashboard) {
      waitForElement('.x-grid-view table tr td span')
        .then(createEUMINFODownloadButton)
        .catch(console.warn);
    }

    // Cleanup: Remove buttons when not on their respective pages
    if (!isIncidentPage) {
      document.getElementById(BT_BTN_ID)?.remove();
    }

    if (!isAppDashboard) {
      document.getElementById(SUMMARY_BTN_ID)?.remove();
    }

    if (!isAllAppsDashboard) {
      document.getElementById(APP_BUTTON_ID)?.remove();
    }

    if (!isAllDBDashboard) {
      document.getElementById(DB_BUTTON_ID)?.remove();
    }

    if (!isEUMDashboard) {
      document.getElementById(EUM_BUTTON_ID)?.remove();
    }
  }

  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const interval = 100;
      let elapsed = 0;
      const timer = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearInterval(timer);
          resolve(el);
        } else if ((elapsed += interval) >= timeout) {
          clearInterval(timer);
          reject(`Timeout waiting for ${selector}`);
        }
      }, interval);
    });
  }

  function showToast(htmlContent) {
    const toast = document.createElement('div');
    toast.innerHTML = htmlContent;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '80px',
      left: '10px',
      zIndex: '10001',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '6px',
      maxWidth: '400px',
      fontSize: '14px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      transition: 'opacity 0.3s ease',
      opacity: '1',
    });

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

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

  // --- End of Common Helpers ---

  // --- Page Specific Functions ---
  // --- BT Violation Extractor ---
  const BT_BTN_ID = 'tm-bt-violation-btn';

  function parseIncidentSummary(html) {
    const btMatch = html.match(/Business Transaction <b>(.*?)<\/b>/);
    const statusMatch = html.match(/is now <b>(.*?)<\/b>/i);
    const status = statusMatch?.[1] || 'N/A';
    const bt = btMatch?.[1] || 'N/A';

    const plainText = html
      .replace(/<br>/gi, '\n')
      .replace(/<\/?[^>]+>/g, '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const btViolations = [];
    const nodeViolations = [];

    plainText.forEach((line) => {
      if (/Average Response Time.*greater than/.test(line))
        btViolations.push('average response time');
      if (/Calls per Minute.*greater than/.test(line))
        btViolations.push('calls per minute');
      if (/Error.*greater than/.test(line))
        btViolations.push('errors per minute');
    });

    if (html.includes('CPU')) nodeViolations.push('CPU');
    if (html.includes('Memory')) nodeViolations.push('memory');
    if (html.includes('JVM')) nodeViolations.push('JVM');

    function formatList(items) {
      if (items.length === 1) return items[0];
      if (items.length === 2) return `${items[0]} dan ${items[1]}`;
      const last = items.pop();
      return `${items.join(', ')}, dan ${last}`;
    }

    if (nodeViolations.length > 0) {
      return {
        bt: 'Node',
        status,
        violation: formatList(nodeViolations),
        message: `Terkait kondisi node dalam keadaan ${status} disebabkan ${formatList(
          nodeViolations
        )} utilization yang terlalu tinggi.`,
      };
    }

    const violation = btViolations.length
      ? formatList([...new Set(btViolations)])
      : 'N/A';
    return {
      bt,
      status,
      violation,
      message: `Berikut detail dari salah satu business transaction, yaitu ${bt}, mengalami kondisi ${status} karena ${violation} lebih tinggi dari baseline dan threshold yang ada.`,
    };
  }

  function createBTViolationButton() {
    if (document.getElementById(BT_BTN_ID)) return;

    const button = document.createElement('button');
    button.id = BT_BTN_ID;
    button.innerText = '📋 Copy BT Violation Info';
    button.className = 'tm-bottom-left-btn';
    button.style = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        z-index: 9999;
        padding: 10px 15px;
        background-color: #dc3545;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      `;

    button.addEventListener('click', () => {
      const summaryEl = document.querySelector(
        '[ng-bind-html="controller.summaryDetails"]'
      );
      if (!summaryEl) {
        showToast('❌ Could not find summary details.');
        return;
      }
      const parsed = parseIncidentSummary(summaryEl.innerHTML);
      const plainText = parsed.message;

      const textarea = document.createElement('textarea');
      textarea.value = plainText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('✅ BT info copied to clipboard.');
    });

    document.body.appendChild(button);
  }

  // --- BT Health Summary Button ---
  const SUMMARY_BTN_ID = 'tm-bt-summary-btn';

  function createBTHealthSummaryButton() {
    if (document.getElementById(SUMMARY_BTN_ID)) return;

    const btn = document.createElement('button');
    btn.id = SUMMARY_BTN_ID;
    btn.innerText = 'BT Summary (ID)';
    btn.className = 'tm-bottom-left-btn';
    btn.style = `
        position: fixed;
        bottom: 60px;
        left: 10px;
        z-index: 9999;
        padding: 8px 12px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      `;

    btn.addEventListener('click', () => {
      const appName = document.title
        .replace(/\s*-\s*AppDynamics\s*$/, '')
        .trim();
      const summaryEl = document.querySelector(
        '.ads-health-bar-component-summary p'
      );
      let normal = 0,
        warning = 0,
        critical = 0;

      if (summaryEl) {
        const text = summaryEl.textContent.trim();
        const normalMatch = text.match(/(\d+)\s+normal/);
        const warningMatch = text.match(/(\d+)\s+warning/);
        const criticalMatch = text.match(/(\d+)\s+critical/);

        normal = normalMatch ? parseInt(normalMatch[1]) : 0;
        warning = warningMatch ? parseInt(warningMatch[1]) : 0;
        critical = criticalMatch ? parseInt(criticalMatch[1]) : 0;
      }

      const total = normal + warning + critical;
      const criticalHTML =
        critical > 0
          ? `<strong>${critical} critical</strong>`
          : `${critical} critical`;
      const htmlContent = `Gambar di atas menunjukkan arsitektur dan performa aplikasi ${appName} secara keseluruhan selama periode pengambilan data. Business transaction health menunjukkan adanya transaksi ${normal} normal, ${criticalHTML}, dan ${warning} warning dari ${total}.`;
      const plainText = htmlContent.replace(/<[^>]+>/g, '');

      showToast(htmlContent);

      const textarea = document.createElement('textarea');
      textarea.value = plainText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      console.log('✅ BT summary copied to clipboard.');
    });

    document.body.appendChild(btn);
  }

  // --- Download App Info as JSON Button ---
  const APP_BUTTON_ID = 'tm-download-btn';

  function createAppInfoAsJSONDownloadButton() {
    if (document.getElementById(APP_BUTTON_ID)) return;

    const button = document.createElement('button');
    button.id = APP_BUTTON_ID;
    button.textContent = 'Download App Info as JSON';

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
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    });

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
        const secondStat = stats[1];
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

  // --- createDBInfoAsJSONDownloadButton ---

  const DB_BUTTON_ID = 'tm-download-db-btn';

  function createDBInfoAsJSONDownloadButton() {
    if (document.getElementById(DB_BUTTON_ID)) return;

    const button = document.createElement('button');
    button.id = DB_BUTTON_ID;
    button.textContent = 'Download DB Info as JSON';

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

  // EUM Info Download Button
  const EUM_BUTTON_ID = 'tm-download-btn-eum';

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

      // ✅ Confirmation toast
      showToast(`✅ Downloaded as <strong>${filename}</strong>`);
    });

    document.body.appendChild(button);
  }

  // --- End of Page Specific Functions ---

  // --- Initialization, DO NOT EDIT AND MOVE ---
  window.addEventListener('load', () => setTimeout(init, 1000));
  observeURLChanges(() => setTimeout(init, 1000));
})();
