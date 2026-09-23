// The visual markup, menu and stylesheet are copied from drink-ordering-gh.
// This adapter uses only the existing Code.gs endpoints and sheet columns.
(function () {
  'use strict';

  const homePage = document.getElementById('home-page');
  const shopPage = document.getElementById('shop-page');
  const shopRoot = shopPage;
  const $ = (id) => document.getElementById(id);
  const shopIds = Object.keys(SHOPS_DATA);
  const shopNameToId = Object.fromEntries(shopIds.map(id => [SHOPS_DATA[id].name, id]));
  // Avoid a literal template delimiter here: GAS scans script text for it.
  const appUrl = GAS_APP_URL && !GAS_APP_URL.startsWith('<' + '?')
    ? GAS_APP_URL : location.href.split(/[?#]/)[0];
  const gasReady = !!(window.google && google.script && google.script.run);
  let currentShop = null;
  let userId = '';
  let allOrders = [];
  let refreshTimer = null;
  let toastTimer = null;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function showToast(message, type = 'success') {
    const toast = $('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 4000);
  }

  function callGas(method, ...args) {
    return new Promise((resolve, reject) => {
      if (!gasReady) return reject(new Error('目前不在 GAS 網頁應用程式中'));
      google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[method](...args);
    });
  }

  // Keep the original GAS identity key so existing users retain delete rights.
  function initUserId(sharedUid) {
    const incoming = typeof sharedUid === 'string' ? sharedUid.trim() : '';
    if (incoming) localStorage.setItem('drink_order_userid', incoming);
    userId = localStorage.getItem('drink_order_userid') || '';
    if (!userId) {
      userId = 'usr_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
      localStorage.setItem('drink_order_userid', userId);
    }
  }

  function updateShare() {
    const link = $('share-link');
    if (link) {
      link.href = appUrl;
      link.textContent = appUrl;
    }
    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=380x380&data=' + encodeURIComponent(appUrl);
    document.querySelectorAll('[data-qr-image]').forEach(image => image.src = qrUrl);
    const label = document.querySelector('.qr-dialog-url');
    if (label) label.textContent = appUrl;
    document.querySelectorAll('.shop-grid a[href^="?shop="]').forEach(anchor => {
      anchor.href = appUrl + anchor.getAttribute('href');
    });
    const back = shopRoot.querySelector('.back-btn');
    if (back) back.href = appUrl;
  }

  function showRoute(shopId) {
    currentShop = SHOPS_DATA[shopId] ? shopId : null;
    homePage.hidden = !!currentShop;
    shopPage.hidden = !currentShop;
    document.body.className = currentShop ? 'shop-page ' + SHOPS_DATA[currentShop].themeClass : '';
    if (refreshTimer) clearInterval(refreshTimer);
    if (currentShop) {
      const info = SHOPS_DATA[currentShop];
      $('shop-title').textContent = info.name;
      $('shop-subtitle').textContent = `朋友同事專屬 · ${info.name} 訂單看板`;
      $('shop-menu-link').href = info.menuLink || '#';
      document.title = `作伙喝飲料！ - ${info.name}`;
      populateMenu(info);
      $('buyer-name').value = localStorage.getItem('drink_order_name') || '';
      renderBoard();
      refreshTimer = setInterval(fetchOrders, 15000);
    } else {
      document.title = '作伙喝飲料！';
      renderLegacy();
    }
    window.scrollTo(0, 0);
  }

  function navigate(shopId) {
    const params = shopId ? {shop: shopId} : {};
    if (window.google && google.script && google.script.history) {
      google.script.history.push({shop: shopId || ''}, params, '');
    } else {
      history.pushState({shop: shopId || ''}, '', shopId ? '?shop=' + encodeURIComponent(shopId) : location.pathname);
    }
    showRoute(shopId);
  }

  function populateMenu(info) {
    const select = $('drink-name');
    select.innerHTML = '<option value="" disabled selected>請選擇飲料品項</option>';
    const groups = new Map();
    info.menu.forEach(drink => {
      const category = drink.category || '其他';
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(drink);
    });
    groups.forEach((drinks, category) => {
      const group = document.createElement('optgroup');
      group.label = category;
      drinks.forEach(drink => {
        const option = document.createElement('option');
        option.value = drink.name;
        option.textContent = drink.name;
        group.appendChild(option);
      });
      select.appendChild(group);
    });
    $('cup-size').innerHTML = '<option value="" disabled selected>請選擇容量</option>';
  }

  function updateSizes() {
    const select = $('cup-size');
    select.innerHTML = '<option value="" disabled selected>請選擇容量</option>';
    const item = SHOPS_DATA[currentShop].menu.find(drink => drink.name === $('drink-name').value);
    if (!item) return;
    Object.entries(item.prices || {}).forEach(([size, price]) => {
      const option = document.createElement('option');
      option.value = size;
      option.dataset.price = price;
      option.textContent = `${size === 'L' ? '大杯 (L)' : '中杯 (M)'} - $${price}`;
      select.appendChild(option);
    });
    if (select.options.length === 2) select.selectedIndex = 1;
  }

  // The sheet has no shop, size or price columns. Store a human-readable
  // snapshot in its existing drink column; deleteOrder still uses timestamp/name.
  function encodeDrink(shopId, name, size, price) {
    return `[${SHOPS_DATA[shopId].name}|${size}|${price}] ${name}`;
  }

  function decodeOrder(row) {
    const raw = String(row.drink || '');
    const match = /^\[([^\]|]+)\|([ML])\|(\d+)\] (.+)$/.exec(raw);
    return {
      timestamp: String(row.timestamp || ''),
      buyerName: String(row.name || ''),
      rawDrink: raw,
      drinkName: match ? match[4] : raw,
      shopId: match ? shopNameToId[match[1]] || null : null,
      size: match ? match[2] : '',
      price: match ? Number(match[3]) : 0,
      cups: Number(row.cups) || 1,
      sweetness: String(row.sugar || ''),
      ice: String(row.ice || ''),
      userId: String(row.userId || '')
    };
  }

  async function fetchOrders() {
    if (!gasReady) {
      $('orders-list').innerHTML = '';
      shopRoot.querySelector('.indicator-text').textContent = '請透過 GAS 網頁應用程式開啟';
      return;
    }
    try {
      const rows = await callGas('getOrders');
      allOrders = (Array.isArray(rows) ? rows : []).map(decodeOrder);
      renderBoard();
      renderLegacy();
      shopRoot.querySelector('.indicator-text').textContent = '每 15 秒更新';
    } catch (error) {
      console.error(error);
      shopRoot.querySelector('.indicator-text').textContent = '載入失敗';
      showToast('訂單載入失敗，請重新整理', 'error');
    }
  }

  function renderLegacy() {
    const oldOrders = allOrders.filter(order => !order.shopId);
    $('legacy-section').hidden = oldOrders.length === 0;
    const list = $('legacy-list');
    list.innerHTML = '';
    oldOrders.forEach(order => {
      const line = document.createElement('p');
      line.innerHTML = `${escapeHtml(order.buyerName)}：${escapeHtml(order.drinkName)} × ${order.cups} 杯`;
      if (!order.userId || order.userId === userId) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'delete-order-btn';
        button.textContent = '刪除';
        button.setAttribute('aria-label', `刪除 ${order.buyerName} 的原有訂單`);
        button.addEventListener('click', () => removeOrder(order));
        line.append(' ', button);
      }
      list.appendChild(line);
    });
  }

  function renderBoard() {
    if (!currentShop) return;
    const orders = allOrders.filter(order => order.shopId === currentShop);
    const list = $('orders-list');
    list.innerHTML = '';
    $('empty-state').classList.toggle('hidden', orders.length !== 0);
    $('stat-people').textContent = new Set(orders.map(order => order.buyerName.trim()).filter(Boolean)).size;
    $('stat-cups').textContent = orders.reduce((sum, order) => sum + order.cups, 0);
    const summary = new Map();
    const payments = new Map();
    orders.forEach(order => {
      const sizeText = order.size === 'L' ? '大杯' : '中杯';
      const subtotal = order.price * order.cups;
      const key = [order.drinkName, order.size, order.price, order.sweetness, order.ice].join('\u001f');
      if (!summary.has(key)) summary.set(key, {...order, cups: 0, total: 0});
      summary.get(key).cups += order.cups;
      summary.get(key).total += subtotal;
      if (!payments.has(order.buyerName)) payments.set(order.buyerName, {items: [], total: 0});
      payments.get(order.buyerName).items.push(`${order.drinkName} (${sizeText} · $${order.price}) x${order.cups}`);
      payments.get(order.buyerName).total += subtotal;

      const own = !order.userId || order.userId === userId;
      const row = document.createElement('div');
      row.className = 'order-row';
      row.innerHTML = `
        <div class="col-name">${escapeHtml(order.buyerName)}</div>
        <div class="col-drink">${escapeHtml(order.drinkName)} (${sizeText} · $${order.price})</div>
        <div class="col-specs"><div class="badge-wrapper">
          <span class="badge badge-sweetness">${escapeHtml(order.sweetness)}</span>
          <span class="badge badge-ice">${escapeHtml(order.ice)}</span>
        </div></div>
        <div class="col-cups"><span class="badge-cups">${order.cups} 杯</span>
          <span style="font-size:.8rem;display:block;margin-top:4px;font-weight:700;color:var(--primary-color)">$${subtotal}</span></div>
        <div class="col-action">${own ? '<button class="delete-order-btn" type="button" title="刪除此訂單"><i class="fa-solid fa-trash-can"></i></button>' : ''}</div>`;
      if (own) row.querySelector('button').addEventListener('click', () => removeOrder(order));
      list.appendChild(row);
    });
    const totals = [...summary.values()].sort((a, b) => a.drinkName.localeCompare(b.drinkName));
    $('summary-table-body').innerHTML = totals.length ? totals.map(item => `
      <tr><td>${escapeHtml(item.drinkName)}</td><td><span class="badge badge-sweetness">${item.size === 'L' ? '大杯' : '中杯'} - $${item.price}</span> / ${escapeHtml(item.sweetness)} / ${escapeHtml(item.ice)}</td>
      <td style="text-align:center">${item.cups} 杯</td><td style="text-align:center">$${item.total}</td></tr>`).join('') +
      `<tr class="summary-row-total"><td colspan="2" style="text-align:right">總計：</td><td>${orders.reduce((n, o) => n + o.cups, 0)} 杯</td><td>$${orders.reduce((n, o) => n + o.price * o.cups, 0)}</td></tr>` :
      '<tr><td colspan="4" style="text-align:center">無統計資料</td></tr>';
    $('payment-table-body').innerHTML = payments.size ? [...payments.entries()].sort((a,b) => a[0].localeCompare(b[0])).map(([name, payment]) => `
      <tr><td>${escapeHtml(name)}</td><td>${escapeHtml(payment.items.join('、'))}</td><td style="text-align:center">$${payment.total}</td></tr>`).join('') :
      '<tr><td colspan="3" style="text-align:center">無統計資料</td></tr>';
  }

  async function removeOrder(order) {
    if (!confirm(`確定刪除「${order.buyerName}」的這筆訂單嗎？`)) return;
    try {
      const result = await callGas('deleteOrder', order.timestamp, order.buyerName, userId);
      if (!result?.success) throw new Error(result?.error || '刪除失敗');
      showToast('訂單已刪除');
      await fetchOrders();
    } catch (error) {
      showToast(error.message || '刪除失敗', 'error');
    }
  }

  async function submitOrder(event) {
    event.preventDefault();
    document.querySelectorAll('#order-form .input-group').forEach(group => group.classList.remove('invalid'));
    const name = $('buyer-name').value.trim();
    const drink = $('drink-name').value;
    const size = $('cup-size').value;
    const sugar = $('sweetness').value;
    const ice = $('ice-level').value;
    const cups = Number($('cup-count').value);
    const fields = [['buyer-name', name], ['drink-name', drink], ['cup-size', size], ['sweetness', sugar], ['ice-level', ice]];
    fields.forEach(([id, value]) => { if (!value) $(id).closest('.input-group').classList.add('invalid'); });
    if (!fields.every(([, value]) => value) || !Number.isInteger(cups) || cups < 1 || cups > 100) {
      showToast('請填寫所有欄位，杯數須為 1 至 100', 'error');
      return;
    }
    const price = Number($('cup-size').selectedOptions[0].dataset.price);
    if (!Number.isFinite(price)) return showToast('請重新選擇容量', 'error');
    const button = $('submit-order-btn');
    button.disabled = true;
    button.querySelector('.btn-text').textContent = '送出中...';
    try {
      const result = await callGas('addOrder', {
        name, drink: encodeDrink(currentShop, drink, size, price), cups, sugar, ice, userId
      });
      if (!result?.success) throw new Error(result?.error || '送出失敗');
      localStorage.setItem('drink_order_name', name);
      showToast('訂單已成功送出！');
      $('drink-name').value = '';
      $('cup-size').innerHTML = '<option value="" disabled selected>請選擇容量</option>';
      $('cup-count').value = 1;
      $('sweetness').value = '';
      $('ice-level').value = '';
      await fetchOrders();
      document.querySelector('.board-section')?.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
    } catch (error) {
      showToast(error.message || '送出失敗', 'error');
    } finally {
      button.disabled = false;
      button.querySelector('.btn-text').textContent = '送出訂單';
    }
  }

  function closeClearModal() {
    $('host-login-modal').classList.add('hidden');
    $('host-password').value = '';
    $('host-password-group').classList.remove('invalid');
  }

  async function clearAll(event) {
    event.preventDefault();
    const password = $('host-password').value.trim();
    if (!password) {
      $('host-password-group').classList.add('invalid');
      return;
    }
    if (!confirm('即將清除試算表中所有店家的全部訂單，確定繼續嗎？')) return;
    const button = $('host-login-submit');
    button.disabled = true;
    try {
      const result = await callGas('deleteAllOrders', password);
      if (!result?.success) throw new Error(result?.error || '清除失敗');
      closeClearModal();
      showToast('所有店家的訂單已清除');
      await fetchOrders();
    } catch (error) {
      $('host-login-error').textContent = error.message || '清除失敗';
      $('host-password-group').classList.add('invalid');
    } finally {
      button.disabled = false;
    }
  }

  document.querySelectorAll('.shop-grid a[href^="?shop="]').forEach(anchor => {
    const shopId = new URLSearchParams(anchor.getAttribute('href')).get('shop');
    anchor.addEventListener('click', event => { event.preventDefault(); navigate(shopId); });
  });
  shopRoot.querySelector('.back-btn').addEventListener('click', event => { event.preventDefault(); navigate(null); });
  $('drink-name').addEventListener('change', updateSizes);
  $('order-form').addEventListener('submit', submitOrder);
  $('stepper-minus').addEventListener('click', () => $('cup-count').value = Math.max(1, (Number($('cup-count').value) || 1) - 1));
  $('stepper-plus').addEventListener('click', () => $('cup-count').value = Math.min(100, (Number($('cup-count').value) || 1) + 1));
  $('host-login-btn').addEventListener('click', () => { $('host-login-modal').classList.remove('hidden'); $('host-password').focus(); });
  $('host-login-close').addEventListener('click', closeClearModal);
  $('host-login-modal').addEventListener('click', event => { if (event.target === $('host-login-modal')) closeClearModal(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeClearModal(); });
  $('host-login-form').addEventListener('submit', clearAll);
  $('qrZoomBtn').addEventListener('click', () => $('qrDialog').showModal());
  $('qrDialogClose').addEventListener('click', () => $('qrDialog').close());
  $('qrDialog').addEventListener('click', event => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
  });
  updateShare();
  if (window.google && google.script && google.script.url) {
    google.script.url.getLocation(locationInfo => {
      initUserId(locationInfo.parameter.uid);
      showRoute(locationInfo.parameter.shop);
      fetchOrders();
    });
    if (google.script.history) google.script.history.setChangeHandler(event => showRoute(event.location.parameter.shop));
  } else {
    const params = new URLSearchParams(location.search);
    initUserId(params.get('uid'));
    showRoute(params.get('shop'));
    fetchOrders();
    window.addEventListener('popstate', () => showRoute(new URLSearchParams(location.search).get('shop')));
  }
})();
