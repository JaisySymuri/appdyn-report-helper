// ==UserScript==
// @name         BT and Node Violation Extractor
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Extract BT violation info from AppDynamics incident details and copy to clipboard
// @author       You
// @include      *://*.appdynamics.com/*
// @include      http://10.62.160.115:8090/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';
  
    const BUTTON_ID = 'tm-bt-violation-btn';
  
    function isIncidentDetailPage() {
      return window.location.href.includes('location=APP_INCIDENT_DETAIL_MODAL');
    }
  
    function waitForElement(selector, timeout = 10000) {
      return new Promise((resolve, reject) => {
        const interval = 300;
        let elapsed = 0;
        const timer = setInterval(() => {
          const el = document.querySelector(selector);
          if (el) {
            clearInterval(timer);
            resolve(el);
          } else if ((elapsed += interval) >= timeout) {
            clearInterval(timer);
            reject('Timeout waiting for element: ' + selector);
          }
        }, interval);
      });
    }
  
    function parseIncidentSummary(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
  
    const btMatch = html.match(/Business Transaction <b>(.*?)<\/b>/);
    const statusMatch = html.match(/is now <b>(.*?)<\/b>/i);
    const status = statusMatch?.[1] || 'N/A';
  
    const bt = btMatch?.[1] || 'N/A';
  
    // Extract plain lines
    const plainText = html
      .replace(/<br>/gi, '\n')
      .replace(/<\/?[^>]+(>|$)/g, '') // remove tags
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
  
    // Match BT-related conditions
    const btViolations = [];
  
    plainText.forEach(line => {
      if (/Average Response Time.*greater than/.test(line)) {
        btViolations.push('average response time');
      }
      if (/Calls per Minute.*greater than/.test(line)) {
        btViolations.push('calls per minute');
      }
      if (/Error.*greater than/.test(line)) {
        btViolations.push('errors per minute');
      }
    });
  
    // Match Node-related conditions
    const nodeViolations = [];
    if (html.includes('CPU')) nodeViolations.push('CPU');
    if (html.includes('Memory')) nodeViolations.push('memory');
    if (html.includes('JVM')) nodeViolations.push('JVM');
  
    function formatList(items) {
      if (items.length === 1) return items[0];
      if (items.length === 2) return `${items[0]} dan ${items[1]}`;
      const last = items.pop();
      return `${items.join(', ')}, dan ${last}`;
    }
  
    // If it's node violation
    if (nodeViolations.length > 0) {
      return {
        bt: 'Node',
        status,
        violation: formatList(nodeViolations),
        message: `Terkait kondisi node dalam keadaan ${status} disebabkan ${formatList(nodeViolations)} utilization yang terlalu tinggi.`,
      };
    }
  
    // Else: BT violation
    const violation = btViolations.length ? formatList([...new Set(btViolations)]) : 'N/A';
  
    return {
      bt,
      status,
      violation,
      message: `Berikut detail dari salah satu business transaction, yaitu ${bt}, mengalami kondisi ${status} karena ${violation} lebih tinggi dari baseline dan threshold yang ada.`,
    };
  }
  
  
    function showToast(message) {
      const toast = document.createElement('div');
      toast.innerText = message;
      Object.assign(toast.style, {
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        zIndex: '9999',
        backgroundColor: '#333',
        color: '#fff',
        padding: '10px 15px',
        borderRadius: '5px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        opacity: '0',
        transition: 'opacity 0.5s',
      });
  
      document.body.appendChild(toast);
      setTimeout(() => (toast.style.opacity = '1'), 100);
  
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toast), 500);
      }, 3000);
    }
  
    function createButton() {
      if (document.getElementById(BUTTON_ID)) return;
  
      const button = document.createElement('button');
      button.id = BUTTON_ID;
      button.innerText = '📋 Copy BT Violation Info';
  
      const existingButtons = document.querySelectorAll('.tm-bottom-left-btn').length;
      const offset = existingButtons * 50 + 10;
  
      button.className = 'tm-bottom-left-btn';
      Object.assign(button.style, {
        position: 'fixed',
        bottom: `${offset}px`,
        left: '10px',
        zIndex: '9999',
        padding: '10px 15px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      });
  
      button.addEventListener('click', () => {
        const summaryEl = document.querySelector('[ng-bind-html="controller.summaryDetails"]');
        if (!summaryEl) {
          showToast('❌ Could not find summary details.');
          return;
        }
  
        const parsed = parseIncidentSummary(summaryEl.innerHTML);
        const plainText = parsed.message;
  
        try {
          const textarea = document.createElement('textarea');
          textarea.value = plainText;
          textarea.style.position = 'fixed'; // Prevent scrolling to the bottom of the page
          textarea.style.opacity = '0'; // Hide the textarea
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          showToast('✅ BT info copied to clipboard.');
        } catch (err) {
          console.error('❌ Failed to copy:', err);
          showToast('❌ Failed to copy. Please try again.');
        }
      });
  
      document.body.appendChild(button);
    }
  
    function manageButtonVisibility() {
      const shouldShow = isIncidentDetailPage();
      const existingBtn = document.getElementById(BUTTON_ID);
  
      if (shouldShow && !existingBtn) {
        waitForElement('[ng-bind-html="controller.summaryDetails"]')
          .then(() => createButton())
          .catch(console.warn);
      } else if (!shouldShow && existingBtn) {
        existingBtn.remove();
      }
    }
  
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
  
    // Initial load
    window.addEventListener('load', () => {
      setTimeout(manageButtonVisibility, 1000);
    });
  
    // Handle SPA navigation
    observeURLChanges(() => {
      setTimeout(manageButtonVisibility, 1000);
    });
  })();