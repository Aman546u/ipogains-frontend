const DashboardApp = {
    init() {
        this.checkAuth();
        this.setupListeners();
        // Initial load of dashboard data is done here, not in checkAuth
        // as checkAuth only handles authentication and user display.
        // loadDashboardData will be called after listeners are set up.
        this.loadDashboardData();
    },

    checkAuth() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = '/';
            return;
        }

        const userData = localStorage.getItem('userData');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                document.getElementById('userEmail').textContent = user.email;
            } catch (e) {
                console.error('Error parsing user data');
            }
        }
    },

    setupListeners() {
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            window.location.href = '/';
        });

        // Global functions for modal
        window.openUpdateModal = this.openUpdateModal.bind(this);
        window.toggleLotInput = this.toggleLotInput.bind(this);
        // Assuming closeModal is a global function defined elsewhere (e.g., in utils.js)
        // If it's not global, it would need to be defined within DashboardApp or passed in.
        window.closeModal = closeModal;
    },

    async loadDashboardData() {
        try {
            const tokenItem = localStorage.getItem('authToken');
            let token;
            try {
                token = JSON.parse(tokenItem);
            } catch (e) {
                token = tokenItem;
            }

            // Fetch User's Applications
            const response = await fetch(`${APP_CONFIG.API_URL}/allotment/my-applications`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.updateStats(data.applications);
                this.renderTable(data.applications);
            } else {
                this.showEmptyState();
            }

        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showEmptyState();
        }
    },

    updateStats(apps) {
        if (!apps) return;

        const total = apps.length;
        const allotted = apps.filter(a => a.status === 'allotted').length;
        const shares = apps
            .filter(a => a.status === 'allotted')
            .reduce((sum, a) => sum + (a.lotSize || 0), 0);

        document.getElementById('totalApplications').textContent = total;
        document.getElementById('totalAllotted').textContent = allotted;
        document.getElementById('totalShares').textContent = shares;
    },

    renderTable(apps) {
        const tbody = document.getElementById('applicationTableBody');

        if (!apps || apps.length === 0) {
            this.showEmptyState();
            return;
        }

        tbody.innerHTML = apps.map(app => `
        <tr>
            <td>
                <strong>${app.ipo ? app.ipo.name : 'Unknown IPO'}</strong>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${app.ipo ? app.ipo.category : ''}</div>
            </td>
            <td style="font-family: monospace;">
                ${app.applicationNumber.startsWith('EXT-') ? '<span style="opacity:0.5; font-size:0.9em">Registrar Ref</span>' : app.applicationNumber}
            </td>
            <td>${new Date(app.appliedDate).toLocaleDateString()}</td>
            <td>${app.lotSize > 0 ? app.lotSize : '-'}</td>
            <td>
                <span class="status-badge status-${app.status}">${this.formatStatus(app.status)}</span>
            </td>
            <td>
                ${(app.applicationNumber.startsWith('EXT-') || app.applicationNumber.startsWith('CHK-') || app.status === 'checked_external') ?
                `<button class="btn-update" onclick="openUpdateModal('${app.id}', '${app.ipo ? app.ipo.name : ''}')" title="Update Status">
                        <i class="fas fa-pencil-alt"></i>
                     </button>` : ''}
            </td>
        </tr>
    `).join('');
    },

    showEmptyState() {
        document.getElementById('applicationTableBody').innerHTML =
            '<tr><td colspan="6" class="text-center p-4">No applications found.</td></tr>';
    },

    formatStatus(status) {
        if (!status) return 'Unknown';
        if (status === 'checked_external') return 'Checked on Registrar';
        return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    },

    openUpdateModal(appId, ipoName) {
        // Create modal if not exists
        if (!document.getElementById('updateStatusModal')) {
            const modalHtml = `
            <div class="modal" id="updateStatusModal">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h2>Update Status</h2>
                        <button class="modal-close" onclick="closeModal('updateStatusModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted mb-3">Update result for <strong id="updateIpoName"></strong></p>
                        <form id="updateStatusForm">
                            <input type="hidden" id="updateAppId">
                            <div class="form-group">
                                <label>Allotment Result</label>
                                <select class="form-control" id="updateStatusSelect" onchange="toggleLotInput(this.value)">
                                    <option value="not_allotted">Not Allotted</option>
                                    <option value="allotted">Allotted</option>
                                </select>
                            </div>
                            <div class="form-group" id="lotSizeGroup" style="display:none;">
                                <label>Shares Allotted</label>
                                <input type="number" class="form-control" id="updateLotSize" placeholder="Enter number of shares">
                            </div>
                            <button type="submit" class="btn btn-primary btn-block">Save Result</button>
                        </form>
                    </div>
                </div>
            </div>
        `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Add form handler
            document.getElementById('updateStatusForm').addEventListener('submit', (e) => this.handleUpdateStatus(e));

            // Add close button listener
            const modal = document.getElementById('updateStatusModal');
            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.classList.remove('active');
                modal.style.display = 'none';
            });

            // Close on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    modal.style.display = 'none';
                }
            });
        }

        document.getElementById('updateIpoName').textContent = ipoName;
        document.getElementById('updateAppId').value = appId;
        document.getElementById('updateStatusSelect').value = 'not_allotted';
        this.toggleLotInput('not_allotted'); // Use 'this' to call internal method

        // Use existing modal helper if available or manual
        const modal = document.getElementById('updateStatusModal');
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex'; // Ensure flex for centering
        }
    },

    toggleLotInput(val) {
        document.getElementById('lotSizeGroup').style.display = val === 'allotted' ? 'block' : 'none';
    },

    async handleUpdateStatus(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        const appId = document.getElementById('updateAppId').value;
        const status = document.getElementById('updateStatusSelect').value;
        const lotSize = document.getElementById('updateLotSize').value;

        const tokenItem = localStorage.getItem('authToken');
        let token;
        try {
            token = JSON.parse(tokenItem);
        } catch (e) {
            token = tokenItem;
        }

        try {
            const response = await fetch(`${APP_CONFIG.API_URL}/allotment/my-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ applicationId: appId, status, lotSize })
            });

            const data = await response.json();

            if (data.success) {
                closeModal('updateStatusModal');
                this.loadDashboardData(); // Reload table using 'this'
                alert('Status updated successfully!');
            } else {
                alert(data.error || 'Failed to update');
            }
        } catch (error) {
            console.error('Update failed', error);
            alert('Update failed');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    DashboardApp.init();
});
