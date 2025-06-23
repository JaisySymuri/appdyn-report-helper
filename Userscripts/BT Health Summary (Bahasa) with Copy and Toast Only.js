// ==UserScript==
// @name         BT Health Summary (Bahasa) with Copy and Toast Only
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Show BT health summary in Bahasa Indonesia as toast and copy to clipboard. Bold only critical > 0. Toast disappears after 5s. Only works on AppDynamics Application Dashboard page.
// @author       You
// @include      *://*.appdynamics.com/*
// @include      http://10.62.160.115:8090/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';
  
    function isApplicationDashboardPage() {
      return window.location.href.includes('location=APP_DASHBOARD');
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
      toast.style.position = 'fixed';
      toast.style.bottom = '80px';
      toast.style.left = '10px';
      toast.style.padding = '12px 16px';
      toast.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
      toast.style.color = 'white';
      toast.style.borderRadius = '6px';
      toast.style.zIndex = '10001';
      toast.style.maxWidth = '400px';
      toast.style.fontSize = '14px';
      toast.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
      toast.style.transition = 'opacity 0.3s ease';
      toast.style.opacity = '1';
  
      document.body.appendChild(toast);
  
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 5000);
    }
  
    function createButton() {
      if (document.getElementById('tm-bt-summary-btn')) return;
  
      const existingButtons = document.querySelectorAll(
        '.tm-bottom-left-btn'
      ).length;
      const buttonOffset = existingButtons * 50 + 10;
  
      const btn = document.createElement('button');
      btn.id = 'tm-bt-summary-btn';
      btn.innerText = 'BT Summary (ID)';
      btn.className = 'tm-bottom-left-btn';
      btn.style.position = 'fixed';
      btn.style.bottom = `${buttonOffset}px`;
      btn.style.left = '10px';
      btn.style.zIndex = '9999';
      btn.style.padding = '8px 12px';
      btn.style.backgroundColor = '#007bff';
      btn.style.color = 'white';
      btn.style.border = 'none';
      btn.style.borderRadius = '4px';
      btn.style.cursor = 'pointer';
      btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
      document.body.appendChild(btn);
  
      btn.addEventListener('click', () => {
        let appName = document.title.replace(/\s*-\s*AppDynamics\s*$/, '').trim();
  
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
  
        const plainText = `Gambar di atas menunjukkan arsitektur dan performa aplikasi ${appName} secara keseluruhan selama periode pengambilan data. Business transaction health menunjukkan adanya transaksi ${normal} normal, ${critical} critical, dan ${warning} warning dari ${total}.\n`;
        const criticalHTML =
          critical > 0
            ? `<strong>${critical} critical</strong>`
            : `${critical} critical`;
        const htmlContent = `Gambar di atas menunjukkan arsitektur dan performa aplikasi ${appName} secara keseluruhan selama periode pengambilan data. Business transaction health menunjukkan adanya transaksi ${normal} normal, ${criticalHTML}, dan ${warning} warning dari ${total}.`;
  
        // Show toast
        showToast(htmlContent);
  
        // Fallback for clipboard copy
        try {
          const textarea = document.createElement('textarea');
          textarea.value = plainText;
          textarea.style.position = 'fixed'; // Prevent scrolling to the bottom of the page
          textarea.style.opacity = '0'; // Hide the textarea
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          console.log('✅ BT summary copied to clipboard using fallback.');
        } catch (err) {
          console.error('❌ Clipboard copy failed:', err);
          showToast('❌ Clipboard copy failed. Please try again.');
        }
      });
    }
  
    function initWhenReady() {
      const shouldShow = isApplicationDashboardPage();
      const existingBtn = document.getElementById('tm-bt-summary-btn');
  
      if (shouldShow && !existingBtn) {
        waitForElement('.ads-health-bar-component-summary p')
          .then(() => createButton())
          .catch(console.warn);
      } else if (!shouldShow && existingBtn) {
        existingBtn.remove();
      }
    }
  
    // Initial run
    window.addEventListener('load', () => {
      setTimeout(initWhenReady, 1500);
    });
  
    // SPA routing
    const origPushState = history.pushState;
    history.pushState = function () {
      origPushState.apply(history, arguments);
      setTimeout(initWhenReady, 1000);
    };
    window.addEventListener('popstate', () => {
      setTimeout(initWhenReady, 1000);
    });
  })();
  