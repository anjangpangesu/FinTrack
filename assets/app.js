// assets/app.js

const KATEGORI_PEMASUKAN = ['Gaji', 'Tabungan', 'Keuntungan Bisnis', 'Pembayaran Hutang', 'Uang Lainnya'];
const KATEGORI_PENGELUARAN = ['Makanan', 'Minuman', 'Peminjaman Duit (Hutang)', 'Paket Data', 'Pulsa', 'Pangkas Rambut', 'Bensin', 'Online Shop', 'Peliharaan', 'Cuci Kendaraan (Steam)', 'Langganan Aplikasi', 'Top Up Game', 'Lainnya'];
const KATEGORI_COLORS = {
    'Gaji': '#18181b', 'Tabungan': '#27272a', 'Keuntungan Bisnis': '#3f3f46', 'Pembayaran Hutang': '#52525b', 'Uang Lainnya': '#71717a',
    'Makanan': '#18181b', 'Minuman': '#27272a', 'Peminjaman Duit (Hutang)': '#3f3f46', 'Paket Data': '#52525b', 'Pulsa': '#71717a', 
    'Pangkas Rambut': '#a1a1aa', 'Bensin': '#d4d4d8', 'Online Shop': '#18181b', 'Peliharaan': '#3f3f46', 'Cuci Kendaraan (Steam)': '#71717a', 
    'Langganan Aplikasi': '#27272a', 'Top Up Game': '#a1a1aa', 'Lainnya': '#52525b'
};

const app = {
    state: {
        currentTab: 'pemasukan',
        data: {
            pemasukan: [],
            pengeluaran: [],
            hutang: []
        },
        charts: {
            pemasukan: null,
            pengeluaran: null
        }
    },
    
    init() {
        // Set Default Month
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const defaultMonth = `${yyyy}-${mm}`;
        document.getElementById('month-ringkasan').value = defaultMonth;
        document.getElementById('month-pemasukan').value = defaultMonth;
        document.getElementById('month-pengeluaran').value = defaultMonth;
        
        // Listeners for month changes
        document.getElementById('month-ringkasan').addEventListener('change', () => this.renderData('ringkasan'));
        document.getElementById('month-pemasukan').addEventListener('change', () => this.renderData('pemasukan'));
        document.getElementById('month-pengeluaran').addEventListener('change', () => this.renderData('pengeluaran'));
        
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
            document.getElementById('dark-mode-icon').className = 'fas fa-sun text-xl';
        } else {
            document.documentElement.classList.remove('dark');
            document.getElementById('dark-mode-icon').className = 'fas fa-moon text-xl';
        }

        // Listeners for category filters
        document.getElementById('filter-cat-pemasukan').addEventListener('change', () => this.renderList('pemasukan'));
        document.getElementById('filter-cat-pengeluaran').addEventListener('change', () => this.renderList('pengeluaran'));
        
        // File input listener for base64 conversion
        document.getElementById('form-bukti').addEventListener('change', this.handleFileSelect);

        // Setup custom dropdowns
        this.initCustomSelect('filter-cat-pemasukan');
        this.initCustomSelect('filter-cat-pengeluaran');
        this.initCustomSelect('form-kategori');

        this.switchTab('ringkasan');
        
        // Check login status
        if (sessionStorage.getItem('fintrack_logged_in') === 'true') {
            document.getElementById('login-overlay').classList.add('hidden');
            this.fetchData();
        }
    },

    async submitLogin(event) {
        event.preventDefault();
        const user = document.getElementById('login-username').value;
        const pass = document.getElementById('login-password').value;
        const btnText = document.getElementById('btn-login-text');
        const spinner = document.getElementById('btn-login-spinner');
        
        const url = this.getAppUrl();
        if (!url) {
            this.showToast('Atur URL Apps Script di pengaturan terlebih dahulu!', 'error');
            return;
        }

        btnText.innerText = 'Memeriksa...';
        spinner.classList.remove('hidden');
        document.getElementById('btn-login').disabled = true;

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'login',
                    username: user,
                    password: pass
                })
            });
            const res = await response.json();
            
            if (res.status === 'success') {
                sessionStorage.setItem('fintrack_logged_in', 'true');
                document.getElementById('login-overlay').classList.add('hidden');
                this.showToast('Login Berhasil');
                this.fetchData();
            } else {
                throw new Error(res.message);
            }
        } catch (error) {
            this.showToast(error.message || 'Gagal login, periksa koneksi atau URL Apps Script', 'error');
        } finally {
            btnText.innerText = 'Masuk';
            spinner.classList.add('hidden');
            document.getElementById('btn-login').disabled = false;
        }
    },

    initCustomSelect(selectId) {
        const select = document.getElementById(selectId);
        if (!select || select.dataset.customized) return;
        
        select.style.display = 'none';
        select.dataset.customized = 'true';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'relative w-full';
        
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = select.className + ' flex justify-between items-center bg-white dark:bg-zinc-950';
        btn.className = btn.className.replace('outline-none', 'focus:outline-none focus:ring-0');
        
        const textSpan = document.createElement('span');
        textSpan.className = 'truncate dark:text-zinc-100';
        textSpan.innerText = select.options[select.selectedIndex]?.text || 'Pilih Kategori';
        
        const icon = document.createElement('i');
        icon.className = 'fas fa-chevron-down text-xs transition-transform duration-200 text-zinc-500 dark:text-zinc-400';
        
        btn.appendChild(textSpan);
        btn.appendChild(icon);
        
        const menu = document.createElement('div');
        menu.className = 'absolute z-50 w-full mt-2 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg hidden flex-col max-h-60 overflow-y-auto transform origin-top transition-all duration-200 scale-95 opacity-0 custom-select-menu';
        
        const updateOptions = () => {
            menu.innerHTML = '';
            Array.from(select.options).forEach(opt => {
                const item = document.createElement('div');
                item.className = 'px-4 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-800 cursor-pointer transition-colors';
                item.innerText = opt.text;
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    select.value = opt.value;
                    textSpan.innerText = opt.text;
                    closeMenu();
                    select.dispatchEvent(new Event('change'));
                });
                menu.appendChild(item);
            });
        };
        
        const openMenu = () => {
            menu.classList.remove('hidden');
            setTimeout(() => {
                menu.classList.remove('scale-95', 'opacity-0');
                icon.classList.add('rotate-180');
            }, 10);
        };
        
        const closeMenu = () => {
            menu.classList.add('scale-95', 'opacity-0');
            icon.classList.remove('rotate-180');
            setTimeout(() => {
                menu.classList.add('hidden');
            }, 200);
        };
        
        updateOptions();
        
        const observer = new MutationObserver(() => {
            updateOptions();
            textSpan.innerText = select.options[select.selectedIndex]?.text || 'Pilih Kategori';
        });
        observer.observe(select, { childList: true });
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (menu.classList.contains('hidden')) {
                document.querySelectorAll('.custom-select-menu:not(.hidden)').forEach(m => {
                    if (m.closeFn) m.closeFn();
                });
                openMenu();
            } else {
                closeMenu();
            }
        });
        
        menu.closeFn = closeMenu;
        
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target) && !menu.classList.contains('hidden')) {
                closeMenu();
            }
        });
        
        wrapper.appendChild(btn);
        wrapper.appendChild(menu);
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
    },

    getAppUrl() {
        return localStorage.getItem('fintrack_app_url') || 'https://script.google.com/macros/s/AKfycbx1WrsK9uGNMhR0LRBzc6BXNWDheBbrdxaAVWVX0fp0QkwR0IDqtEHJHKyh88H0p0e1Ew/exec';
    },

    toggleDarkMode() {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        document.getElementById('dark-mode-icon').className = isDark ? 'fas fa-sun text-xl' : 'fas fa-moon text-xl';
        // Re-render chart if it exists
        this.renderData(this.state.currentTab);
    },

    openSettingsModal() {
        document.getElementById('setting-app-url').value = this.getAppUrl() || '';
        document.getElementById('modal-settings').classList.remove('hidden');
    },

    saveSettings() {
        const url = document.getElementById('setting-app-url').value.trim();
        if (url) {
            localStorage.setItem('fintrack_app_url', url);
            this.showToast('Pengaturan disimpan', 'success');
            this.closeModal('modal-settings');
            this.fetchData();
        } else {
            this.showToast('URL tidak boleh kosong', 'error');
        }
    },

    switchTab(tabId) {
        this.state.currentTab = tabId;
        
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        // Show target tab
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');
        
        // Update nav links
        document.querySelectorAll('.tab-link').forEach(el => {
            el.dataset.target === tabId ? el.classList.add('active') : el.classList.remove('active');
        });
        document.querySelectorAll('.tab-link-mob').forEach(el => {
            el.dataset.target === tabId ? el.classList.add('active') : el.classList.remove('active');
        });

        this.renderData(tabId);
    },

    formatRupiah(amount) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    },

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
    },

    showLoading(show, text = 'Memuat Data...') {
        const loader = document.getElementById('global-loading');
        if (show) {
            document.getElementById('loading-text').innerText = text;
            loader.classList.remove('hidden');
        } else {
            loader.classList.add('hidden');
        }
    },

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const icon = document.getElementById('toast-icon');
        const title = document.getElementById('toast-title');
        const msg = document.getElementById('toast-msg');
        
        if (type === 'success') {
            toast.className = 'fixed top-4 right-4 z-[110] transform transition-all duration-300 bg-white border-l-4 border-emerald-500 shadow-lg rounded p-4 flex items-center max-w-xs w-full pointer-events-none translate-y-0 opacity-100';
            icon.className = 'fas fa-check-circle text-emerald-500 text-2xl mr-3';
            title.innerText = 'Berhasil';
        } else {
            toast.className = 'fixed top-4 right-4 z-[110] transform transition-all duration-300 bg-white border-l-4 border-rose-500 shadow-lg rounded p-4 flex items-center max-w-xs w-full pointer-events-none translate-y-0 opacity-100';
            icon.className = 'fas fa-exclamation-circle text-rose-500 text-2xl mr-3';
            title.innerText = 'Error';
        }
        
        msg.innerText = message;
        
        setTimeout(() => {
            toast.classList.replace('translate-y-0', 'translate-y-[-150%]');
            toast.classList.replace('opacity-100', 'opacity-0');
        }, 3000);
    },

    showConfirm(message, onConfirm) {
        const modal = document.getElementById('modal-confirm');
        document.getElementById('confirm-message').innerText = message;
        modal.classList.remove('hidden');

        const btnOk = document.getElementById('btn-confirm-ok');
        const btnCancel = document.getElementById('btn-confirm-cancel');

        // Remove old event listeners by cloning nodes
        const newBtnOk = btnOk.cloneNode(true);
        const newBtnCancel = btnCancel.cloneNode(true);
        btnOk.parentNode.replaceChild(newBtnOk, btnOk);
        btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);

        newBtnCancel.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        newBtnOk.addEventListener('click', () => {
            modal.classList.add('hidden');
            if (onConfirm) onConfirm();
        });
    },

    async fetchData() {
        const url = this.getAppUrl();
        if (!url) {
            this.showToast('Harap atur URL Apps Script di Pengaturan', 'error');
            return;
        }

        this.showLoading(true);
        try {
            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify({ action: 'get_all' })
            });
            const res = await response.json();
            
            if (res.status === 'success') {
                this.state.data = res.data;
                this.renderData(this.state.currentTab);
            } else {
                throw new Error(res.message);
            }
        } catch (error) {
            this.showToast('Gagal memuat data', 'error');
            console.error(error);
        } finally {
            this.showLoading(false);
        }
    },

    renderData(tabId) {
        if (tabId === 'ringkasan') {
            this.renderRingkasan();
        } else {
            if (tabId === 'pemasukan' || tabId === 'pengeluaran') {
                this.renderChart(tabId);
            }
            this.renderList(tabId);
        }
    },

    navigateMonth(offset) {
        const input = document.getElementById('month-ringkasan');
        if (!input.value) return;
        const [yyyy, mm] = input.value.split('-');
        const date = new Date(yyyy, parseInt(mm) - 1 + offset, 1);
        const newY = date.getFullYear();
        const newM = String(date.getMonth() + 1).padStart(2, '0');
        input.value = `${newY}-${newM}`;
        this.renderRingkasan();
    },

    renderRingkasan() {
        const monthVal = document.getElementById('month-ringkasan').value;
        if (!monthVal) return;
        const [year, month] = monthVal.split('-');
        
        // Saldo Terkini (All Time)
        const allPemasukan = (this.state.data.pemasukan || []).reduce((acc, curr) => acc + (parseFloat(curr.Nominal) || 0), 0);
        const allPengeluaran = (this.state.data.pengeluaran || []).reduce((acc, curr) => acc + (parseFloat(curr.Nominal) || 0), 0);
        const saldoTerkini = allPemasukan - allPengeluaran;

        // Pemasukan Bulanan
        const monthPemasukan = (this.state.data.pemasukan || [])
            .filter(item => item.Tanggal && item.Tanggal.startsWith(monthVal))
            .reduce((acc, curr) => acc + (parseFloat(curr.Nominal) || 0), 0);
            
        // Pengeluaran Bulanan
        const monthPengeluaran = (this.state.data.pengeluaran || [])
            .filter(item => item.Tanggal && item.Tanggal.startsWith(monthVal))
            .reduce((acc, curr) => acc + (parseFloat(curr.Nominal) || 0), 0);

        document.getElementById('ringkasan-saldo').innerText = this.formatRupiah(saldoTerkini);
        document.getElementById('ringkasan-pemasukan').innerText = this.formatRupiah(monthPemasukan);
        document.getElementById('ringkasan-pengeluaran').innerText = this.formatRupiah(monthPengeluaran);
        
        // Month string formatting
        const dateObj = new Date(year, parseInt(month) - 1, 1);
        const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(dateObj);
        document.getElementById('label-ringkasan-pemasukan').innerText = `Pemasukan ${monthName}`;
        document.getElementById('label-ringkasan-pengeluaran').innerText = `Pengeluaran ${monthName}`;
    },

    renderList(type) {
        const container = document.getElementById(`list-${type}`);
        container.innerHTML = '';
        let data = this.state.data[type] || [];
        
        // Filter by month for Pemasukan and Pengeluaran
        if (type !== 'hutang') {
            const monthVal = document.getElementById(`month-${type}`).value; // YYYY-MM
            data = data.filter(item => item.Tanggal && item.Tanggal.startsWith(monthVal));
            
            // Filter by Category
            const catFilter = document.getElementById(`filter-cat-${type}`).value;
            if (catFilter) {
                data = data.filter(item => item.Kategori === catFilter);
            }
        }

        // Sort descending by date
        data.sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal));

        if (data.length === 0) {
            container.innerHTML = `<div class="col-span-full text-center py-10 text-slate-500">
                <i class="fas fa-inbox text-4xl mb-3 opacity-50"></i>
                <p>Tidak ada data ditemukan.</p>
            </div>`;
            return;
        }

        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'bg-white dark:bg-zinc-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] border-2 border-zinc-900 dark:border-zinc-700 p-5 data-card flex flex-col justify-between h-full transition-all';
            
            if (type === 'pemasukan' || type === 'pengeluaran') {
                const colorType = 'text-white bg-zinc-900 border-zinc-900 dark:bg-white dark:text-zinc-900';
                const icon = type === 'pemasukan' ? 'fa-arrow-down' : 'fa-arrow-up';
                let buktiHtml = '';
                if (type === 'pengeluaran' && item['Bukti URL']) {
                    buktiHtml = `<a href="${item['Bukti URL']}" target="_blank" class="mt-3 inline-flex items-center text-xs text-zinc-900 bg-zinc-100 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 px-3 py-1.5 rounded-full hover:bg-zinc-200 transition-colors"><i class="fas fa-file-invoice mr-1.5"></i> Lihat Bukti</a>`;
                }

                card.innerHTML = `
                    <div>
                        <div class="flex justify-between items-start mb-3">
                            <span class="text-[11px] font-semibold px-3 py-1 rounded-full border ${colorType} flex items-center shadow-sm">
                                <i class="fas ${icon} mr-1.5"></i>${item.Kategori}
                            </span>
                            <span class="text-xs text-zinc-500 dark:text-zinc-400 font-medium bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700">${this.formatDate(item.Tanggal)}</span>
                        </div>
                        <h4 class="font-black text-xl text-zinc-900 dark:text-zinc-100 mb-1 tracking-tight">${this.formatRupiah(item.Nominal)}</h4>
                        <p class="text-sm text-slate-600 dark:text-zinc-400 line-clamp-2">${item.Keterangan || '-'}</p>
                        ${buktiHtml}
                    </div>
                    <div class="flex justify-end space-x-2 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        <button onclick="app.editData('${type}', '${item.ID}')" class="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 p-2 transition-colors"><i class="fas fa-edit"></i></button>
                        <button onclick="app.deleteData('${type}', '${item.ID}')" class="text-zinc-400 hover:text-rose-500 p-2 transition-colors"><i class="fas fa-trash"></i></button>
                    </div>
                `;
            } else if (type === 'hutang') {
                const isLunas = item.Status === 'Lunas';
                const statusColor = 'text-white bg-zinc-900 border border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white';
                const sisa = item.Nominal - (item.Terbayar || 0);
                
                card.innerHTML = `
                    <div>
                        <div class="flex justify-between items-start mb-3">
                            <span class="text-[11px] font-semibold px-3 py-1 rounded-full ${statusColor} shadow-sm">${item.Status}</span>
                            <span class="text-xs text-zinc-500 dark:text-zinc-400 font-medium bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700">${this.formatDate(item.Tanggal)}</span>
                        </div>
                        <h4 class="font-black text-xl text-zinc-900 dark:text-zinc-100 tracking-tight">${item.Pihak}</h4>
                        <div class="mt-3 space-y-1 border-l-2 border-zinc-200 dark:border-zinc-700 pl-3">
                            <div class="flex justify-between text-sm"><span class="text-zinc-500 dark:text-zinc-400">Total:</span> <span class="font-semibold text-zinc-900 dark:text-zinc-100">${this.formatRupiah(item.Nominal)}</span></div>
                            <div class="flex justify-between text-sm"><span class="text-zinc-500 dark:text-zinc-400">Terbayar:</span> <span class="font-semibold text-zinc-900 dark:text-zinc-100">${this.formatRupiah(item.Terbayar || 0)}</span></div>
                            <div class="flex justify-between text-sm"><span class="text-zinc-500 dark:text-zinc-400">Sisa:</span> <span class="font-black text-zinc-900 dark:text-zinc-100">${this.formatRupiah(sisa)}</span></div>
                        </div>
                        <p class="text-sm text-slate-600 dark:text-zinc-400 mt-2 line-clamp-1">${item.Keterangan || '-'}</p>
                    </div>
                    <div class="flex justify-end space-x-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        ${!isLunas ? `<button onclick="app.openBayarModal('${item.ID}', ${sisa})" class="text-zinc-900 bg-white border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-600 hover:bg-zinc-100 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors shadow-sm"><i class="fas fa-check mr-1.5"></i>Bayar</button>` : ''}
                        <button onclick="app.editData('hutang', '${item.ID}')" class="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 p-2 transition-colors"><i class="fas fa-edit"></i></button>
                        <button onclick="app.deleteData('hutang', '${item.ID}')" class="text-zinc-400 hover:text-rose-500 p-2 transition-colors" title="Hapus Data"><i class="fas fa-trash"></i></button>
                    </div>
                `;
            }
            container.appendChild(card);
        });
    },

    renderChart(type) {
        const monthVal = document.getElementById(`month-${type}`).value;
        if (!monthVal) return;
        
        const [year, month] = monthVal.split('-');
        const daysInMonth = new Date(year, month, 0).getDate();
        
        const labels = Array.from({length: daysInMonth}, (_, i) => i + 1);
        const categories = type === 'pemasukan' ? KATEGORI_PEMASUKAN : KATEGORI_PENGELUARAN;
        
        let rawData = this.state.data[type] || [];
        // Filter by month
        rawData = rawData.filter(item => item.Tanggal && item.Tanggal.startsWith(monthVal));

        const isDark = document.documentElement.classList.contains('dark');

        const datasets = categories.map(cat => {
            const dataArr = Array(daysInMonth).fill(0);
            rawData.forEach(item => {
                if (item.Kategori === cat) {
                    const d = parseInt(item.Tanggal.split('-')[2]);
                    if(d > 0 && d <= daysInMonth) {
                        dataArr[d - 1] += parseFloat(item.Nominal) || 0;
                    }
                }
            });
            
            return {
                label: cat,
                data: dataArr,
                backgroundColor: KATEGORI_COLORS[cat] || (isDark ? '#e4e4e7' : '#27272a'),
                borderRadius: 4
            };
        }).filter(dataset => dataset.data.some(val => val > 0)); 

        const ctx = document.getElementById(`chart-${type}`).getContext('2d');
        
        if (this.state.charts[type]) {
            this.state.charts[type].destroy();
        }

        Chart.defaults.color = isDark ? '#a1a1aa' : '#52525b';
        Chart.defaults.borderColor = isDark ? '#27272a' : '#f4f4f5';

        this.state.charts[type] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: false,
                        grid: { display: false }
                    },
                    y: {
                        stacked: false,
                        border: { display: false },
                        ticks: {
                            callback: function(value) {
                                return new Intl.NumberFormat('id-ID', { notation: 'compact', compactDisplay: 'short' }).format(value);
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 12, usePointStyle: true, font: { size: 10 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    },

    openModal(id) {
        document.getElementById(id).classList.remove('hidden');
    },

    closeModal(id) {
        document.getElementById(id).classList.add('hidden');
        if (id === 'modal-form') {
            document.getElementById('data-form').reset();
            this.base64FileData = null;
            document.getElementById('form-bukti-info').innerText = '';
        } else if (id === 'modal-bayar') {
            document.getElementById('bayar-form').reset();
        }
    },

    openAddModal() {
        const type = this.state.currentTab;
        document.getElementById('form-type').value = type;
        document.getElementById('form-id').value = '';
        document.getElementById('modal-title').innerText = `Tambah ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        
        // Setup Date
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('form-tanggal').value = today;

        // Setup Fields based on type
        const fieldKat = document.getElementById('field-kategori');
        const selKat = document.getElementById('form-kategori');
        const fieldPihak = document.getElementById('field-pihak');
        const fieldBukti = document.getElementById('field-bukti');
        
        if (type === 'pemasukan' || type === 'pengeluaran') {
            fieldKat.classList.remove('hidden');
            fieldPihak.classList.add('hidden');
            fieldBukti.classList.toggle('hidden', type !== 'pengeluaran');
            selKat.required = true;
            document.getElementById('form-pihak').required = false;
            
            // Populate options
            selKat.innerHTML = '';
            const cats = type === 'pemasukan' ? KATEGORI_PEMASUKAN : KATEGORI_PENGELUARAN;
            cats.forEach(c => {
                selKat.innerHTML += `<option value="${c}">${c}</option>`;
            });
        } else if (type === 'hutang') {
            fieldKat.classList.add('hidden');
            fieldPihak.classList.remove('hidden');
            fieldBukti.classList.add('hidden');
            selKat.required = false;
            document.getElementById('form-pihak').required = true;
        }

        this.openModal('modal-form');
    },

    editData(type, id) {
        const item = this.state.data[type].find(d => d.ID === id);
        if (!item) return;

        this.switchTab(type); // Ensure we are on the right tab
        this.openAddModal();
        document.getElementById('modal-title').innerText = `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        document.getElementById('form-id').value = id;
        
        // Fill form
        document.getElementById('form-tanggal').value = item.Tanggal ? item.Tanggal.split('T')[0] : '';
        document.getElementById('form-nominal').value = item.Nominal || 0;
        document.getElementById('form-keterangan').value = item.Keterangan || '';
        
        if (type === 'pemasukan' || type === 'pengeluaran') {
            document.getElementById('form-kategori').value = item.Kategori;
            // Update custom dropdown visually
            document.getElementById('form-kategori').dispatchEvent(new Event('change'));
        } else if (type === 'hutang') {
            document.getElementById('form-pihak').value = item.Pihak || '';
        }
    },

    base64FileData: null,
    
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Check size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            app.showToast('Ukuran file maksimal 2MB', 'error');
            event.target.value = '';
            app.base64FileData = null;
            document.getElementById('form-bukti-info').innerText = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            app.base64FileData = {
                data: e.target.result.split(',')[1],
                mimeType: file.type,
                name: file.name
            };
            document.getElementById('form-bukti-info').innerText = `${file.name} (${(file.size/1024).toFixed(1)} KB)`;
        };
        reader.readAsDataURL(file);
    },

    async submitForm(event) {
        event.preventDefault();
        const type = document.getElementById('form-type').value;
        const formId = document.getElementById('form-id').value;
        const btn = document.getElementById('btn-submit');
        const spinner = document.getElementById('btn-submit-spinner');
        
        let payload = {
            action: formId ? `edit_${type}` : `add_${type}`,
            id: formId,
            tanggal: document.getElementById('form-tanggal').value,
            nominal: document.getElementById('form-nominal').value,
            keterangan: document.getElementById('form-keterangan').value
        };

        if (type === 'pemasukan' || type === 'pengeluaran') {
            payload.kategori = document.getElementById('form-kategori').value;
            if (type === 'pengeluaran' && this.base64FileData) {
                payload.fileData = this.base64FileData.data;
                payload.mimeType = this.base64FileData.mimeType;
                payload.fileName = this.base64FileData.name;
            }
        } else if (type === 'hutang') {
            payload.pihak = document.getElementById('form-pihak').value;
        }

        btn.disabled = true;
        spinner.classList.remove('hidden');
        document.getElementById('btn-submit-text').innerText = 'Menyimpan...';

        try {
            const url = this.getAppUrl();
            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const res = await response.json();
            
            if (res.status === 'success') {
                this.showToast('Data berhasil ditambahkan');
                this.closeModal('modal-form');
                await this.fetchData();
            } else {
                throw new Error(res.message);
            }
        } catch (error) {
            this.showToast('Gagal menyimpan data', 'error');
            console.error(error);
        } finally {
            btn.disabled = false;
            spinner.classList.add('hidden');
            document.getElementById('btn-submit-text').innerText = 'Simpan';
        }
    },

    deleteData(type, id) {
        this.showConfirm(`Yakin ingin menghapus data ${type} ini?`, async () => {
            this.showLoading(true, 'Menghapus...');
            try {
                const url = this.getAppUrl();
                const response = await fetch(url, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: `delete_${type}`,
                        id: id
                    })
                });
                const res = await response.json();
                
                if (res.status === 'success') {
                    this.showToast('Data berhasil dihapus');
                    await this.fetchData();
                } else {
                    throw new Error(res.message);
                }
            } catch (error) {
                this.showToast('Gagal menghapus data', 'error');
                console.error(error);
            } finally {
                this.showLoading(false);
            }
        });
    },

    openBayarModal(id, sisa) {
        document.getElementById('bayar-id').value = id;
        document.getElementById('bayar-sisa').innerText = this.formatRupiah(sisa);
        document.getElementById('bayar-nominal').max = sisa;
        document.getElementById('bayar-nominal').value = '';
        this.openModal('modal-bayar');
    },

    async submitBayar(event) {
        event.preventDefault();
        const id = document.getElementById('bayar-id').value;
        const nominal = document.getElementById('bayar-nominal').value;
        
        const btn = document.getElementById('btn-bayar');
        const spinner = document.getElementById('btn-bayar-spinner');
        
        btn.disabled = true;
        spinner.classList.remove('hidden');
        document.getElementById('btn-bayar-text').innerText = 'Memproses...';

        try {
            const url = this.getAppUrl();
            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'pay_hutang',
                    id: id,
                    nominal: nominal,
                    tanggal: new Date().toISOString().split('T')[0]
                })
            });
            const res = await response.json();
            
            if (res.status === 'success') {
                this.showToast('Pembayaran berhasil dicatat');
                this.closeModal('modal-bayar');
                await this.fetchData();
            } else {
                throw new Error(res.message);
            }
        } catch (error) {
            this.showToast('Gagal mencatat pembayaran', 'error');
            console.error(error);
        } finally {
            btn.disabled = false;
            spinner.classList.add('hidden');
            document.getElementById('btn-bayar-text').innerText = 'Bayar';
        }
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
