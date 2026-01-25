// Admin Panel JavaScript
const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : 'http://localhost:3000/api';

// Helper to get token correctly (handling JSON stringification)
const getStoredToken = () => {
    const item = localStorage.getItem('authToken');
    try {
        return item ? JSON.parse(item) : null;
    } catch (e) {
        return item; // If not JSON, return as is
    }
};

const authToken = getStoredToken();

// Check admin auth
if (!authToken) {
    window.location.href = '/';
}

let currentIPOs = [];
let currentUsers = [];
let editingIPOId = null;

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

// Toast function
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    setupNavigation();
    loadDashboardStats();
    loadIPOs();
    loadUsers();
    loadSubDetailIPOs();
    setupEventListeners();
    setupSubTriggerListeners();
});

async function checkAdminAuth() {
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.status === 401 || response.status === 403) {
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            console.error('Server error during auth check');
            return; // Don't logout on server error
        }

        const data = await response.json();

        if (data.user.role !== 'admin') {
            showToast('Admin access required', 'error');
            setTimeout(() => window.location.href = '/', 2000);
            return;
        }

        document.getElementById('adminEmail').textContent = data.user.email;
        document.getElementById('settingsEmail').value = data.user.email;
    } catch (error) {
        console.error('Auth check failed:', error);
        if (error.message === 'Unauthorized') {
            localStorage.removeItem('authToken');
            window.location.href = '/';
        }
    }
}

function setupNavigation() {
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            const section = item.dataset.section;

            // Update active nav item
            document.querySelectorAll('.sidebar-nav .nav-item').forEach(i => {
                i.classList.remove('active');
            });
            item.classList.add('active');

            // Show section
            document.querySelectorAll('.admin-section').forEach(s => {
                s.classList.remove('active');
            });
            document.getElementById(`section-${section}`).classList.add('active');

            // Update page title
            const titles = {
                'dashboard': 'Dashboard',
                'ipos': 'Manage IPOs',
                'users': 'Users',
                'settings': 'Settings',
                'subscriptions': 'Subscription Details',
                'listing': 'Listing Manager'
            };
            document.getElementById('pageTitle').textContent = titles[section] || 'Admin Panel';

            // Lazy load listing data
            if (section === 'listing') loadListingIPOs();
        });
    });
}

function setupEventListeners() {
    document.getElementById('adminLogout')?.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/';
    });

    document.getElementById('addIPOBtn')?.addEventListener('click', () => {
        editingIPOId = null;
        document.getElementById('ipoFormTitle').textContent = 'Add New IPO';
        document.getElementById('ipoForm').reset();
        openModal('ipoFormModal');
    });

    document.getElementById('ipoForm')?.addEventListener('submit', handleIPOSubmit);

    // Separate Save Listeners
    document.getElementById('saveAppSubBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        handleAppSubSubmit();
    });

    document.getElementById('saveShareSubBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        handleShareSubSubmit();
    });

    // Sidebar navigation highlight for subscription list
    document.getElementById('subDetailTableBody')?.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (!row) return;

        // Highlight active row
        document.querySelectorAll('#subDetailTableBody tr').forEach(r => r.classList.remove('active-sub-row'));
        row.classList.add('active-sub-row');

        const id = row.dataset.id;
        selectIPOSub(id);
    });

    // Event Delegation for IPO Table Buttons
    document.getElementById('iposTableBody')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.action-btn');
        if (!btn) return;

        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === 'edit') editIPO(id);
        else if (action === 'subscription') activateSubscriptionTab(id);
        else if (action === 'gmp') addGMP(id);
        else if (action === 'delete') deleteIPO(id);
    });

    // Close modals on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    // Mobile Sidebar Toggle
    const sidebarToggle = document.getElementById('adminSidebarToggle');
    const adminSidebar = document.querySelector('.admin-sidebar');

    if (sidebarToggle && adminSidebar) {
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            adminSidebar.classList.toggle('active');
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (adminSidebar.classList.contains('active')) {
                if (!adminSidebar.contains(e.target) && e.target !== sidebarToggle) {
                    adminSidebar.classList.remove('active');
                }
            }
        });
    }
}

function activateSubscriptionTab(ipoId) {
    // Click the subscription nav item
    const subNavItem = document.querySelector('.nav-item[data-section="subscriptions"]');
    if (subNavItem) subNavItem.click();

    // Select the IPO in the left pane
    setTimeout(() => {
        const row = document.querySelector(`.sub-selection-row[data-id="${ipoId}"]`);
        if (row) row.click();
    }, 100);
}

async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_URL}/admin/dashboard/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.stats) {
            document.getElementById('adminTotalIPOs').textContent = data.stats.totalIPOs;
            document.getElementById('adminActiveIPOs').textContent = data.stats.activeIPOs;
            document.getElementById('adminUpcomingIPOs').textContent = data.stats.upcomingIPOs;
            document.getElementById('adminTotalUsers').textContent = data.stats.totalUsers;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        showToast('Failed to load dashboard stats', 'error');
    }
}

async function loadIPOs() {
    try {
        const response = await fetch(`${API_URL}/ipos`);
        const data = await response.json();

        currentIPOs = data.ipos || [];
        displayIPOsTable(currentIPOs);
    } catch (error) {
        console.error('Error loading IPOs:', error);
        document.getElementById('iposTableBody').innerHTML =
            '<tr><td colspan="7" class="text-center text-danger">Failed to load IPOs</td></tr>';
    }
}

function displayIPOsTable(ipos) {
    const tbody = document.getElementById('iposTableBody');

    if (!ipos || ipos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No IPOs found. Click "Add New IPO" to create one.</td></tr>';
        return;
    }

    tbody.innerHTML = ipos.map(ipo => `
        <tr>
            <td><strong>${ipo.companyName}</strong></td>
            <td><span class="ipo-category">${ipo.category}</span></td>
            <td>₹${ipo.priceRange.min} - ₹${ipo.priceRange.max}</td>
            <td><span class="status-badge status-${ipo.status}">${ipo.status}</span></td>
            <td>${formatDate(ipo.openDate)}</td>
            <td>${formatDate(ipo.closeDate)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary action-btn" data-action="edit" data-id="${ipo._id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline action-btn" data-action="subscription" data-id="${ipo._id}" title="Update Subscription">
                        <i class="fas fa-chart-bar"></i>
                    </button>
                    <button class="btn btn-sm btn-outline action-btn" data-action="gmp" data-id="${ipo._id}" title="Add GMP">
                        <i class="fas fa-plus"></i> GMP
                    </button>
                    <button class="btn btn-sm btn-danger action-btn" data-action="delete" data-id="${ipo._id}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function handleIPOSubmit(e) {
    e.preventDefault();

    const priceMax = parseFloat(document.getElementById('priceMax').value) || 0;
    const lotSize = parseInt(document.getElementById('lotSize').value) || 0;
    const priceMin = parseFloat(document.getElementById('priceMin').value) || 0;
    const minInv = parseFloat(document.getElementById('minInvestment').value) || (priceMax * lotSize);

    const formData = {
        companyName: document.getElementById('companyName').value,
        companyLogo: document.getElementById('companyLogo').value.trim(),
        category: document.getElementById('category').value,
        sector: document.getElementById('sector').value,
        issueSize: parseFloat(document.getElementById('issueSize').value) || 0,
        priceRange: {
            min: priceMin,
            max: priceMax
        },
        lotSize: lotSize,
        minInvestment: minInv,
        openDate: document.getElementById('openDate').value,
        closeDate: document.getElementById('closeDate').value,
        allotmentDate: document.getElementById('allotmentDate').value,
        listingDate: document.getElementById('listingDate').value,
        registrar: document.getElementById('registrar').value,
        allotmentLink: document.getElementById('allotmentLink').value.trim(), // Add Registrar Link and trim whitespace
        faceValue: parseFloat(document.getElementById('faceValue').value) || 0
    };

    // Validation
    const requiredFields = ['companyName', 'sector', 'openDate', 'closeDate', 'allotmentDate', 'listingDate', 'registrar'];
    const missingField = requiredFields.find(field => !formData[field]);

    if (missingField) {
        showToast(`Please fill all required fields (${missingField})`, 'error');
        return;
    }

    try {
        const url = editingIPOId
            ? `${API_URL}/admin/ipos/${editingIPOId}`
            : `${API_URL}/admin/ipos`;

        const method = editingIPOId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'success');
            closeModal('ipoFormModal');
            loadIPOs();
            loadDashboardStats();
            loadSubDetailIPOs(); // Refresh subscription list too
        } else {
            showToast(data.error || 'Failed to save IPO', 'error');
        }
    } catch (error) {
        console.error('Error saving IPO:', error);
        showToast('An error occurred', 'error');
    }
}

async function editIPO(ipoId) {
    const ipo = currentIPOs.find(i => i._id === ipoId);
    if (!ipo) return;

    editingIPOId = ipoId;
    document.getElementById('ipoFormTitle').textContent = 'Edit IPO';

    document.getElementById('companyName').value = ipo.companyName;
    document.getElementById('companyLogo').value = ipo.companyLogo || '';
    document.getElementById('category').value = ipo.category;
    document.getElementById('sector').value = ipo.sector;
    document.getElementById('issueSize').value = ipo.issueSize;
    document.getElementById('priceMin').value = ipo.priceRange.min;
    document.getElementById('priceMax').value = ipo.priceRange.max;
    document.getElementById('lotSize').value = ipo.lotSize;
    document.getElementById('minInvestment').value = ipo.minInvestment || (ipo.priceRange.max * ipo.lotSize);

    document.getElementById('openDate').value = ipo.openDate.split('T')[0];
    document.getElementById('closeDate').value = ipo.closeDate.split('T')[0];
    document.getElementById('allotmentDate').value = ipo.allotmentDate.split('T')[0];
    document.getElementById('listingDate').value = ipo.listingDate.split('T')[0];
    document.getElementById('registrar').value = ipo.registrar;
    document.getElementById('allotmentLink').value = ipo.allotmentLink || ''; // Populate Registrar Link
    document.getElementById('faceValue').value = ipo.faceValue;

    openModal('ipoFormModal');
}

async function deleteIPO(ipoId) {
    if (!confirm('Are you sure you want to delete this IPO?')) return;

    try {
        const response = await fetch(`${API_URL}/admin/ipos/${ipoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'success');
            loadIPOs();
            loadDashboardStats();
            loadSubDetailIPOs();
        } else {
            showToast(data.error || 'Failed to delete IPO', 'error');
        }
    } catch (error) {
        console.error('Error deleting IPO:', error);
        showToast('An error occurred', 'error');
    }
}

async function addGMP(ipoId) {
    const value = prompt('Enter GMP value (₹):');

    if (!value) return;

    try {
        const response = await fetch(`${API_URL}/admin/ipos/${ipoId}/gmp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ value: parseFloat(value) })
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'success');
            loadIPOs();
        } else {
            showToast(data.error || 'Failed to add GMP', 'error');
        }
    } catch (error) {
        console.error('Error adding GMP:', error);
        showToast('An error occurred', 'error');
    }
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        currentUsers = data.users || [];
        displayUsersTable(currentUsers);
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('usersTableBody').innerHTML =
            '<tr><td colspan="5" class="text-center text-danger">Failed to load users</td></tr>';
    }
}

function displayUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');

    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.email}</td>
            <td><span class="ipo-category">${user.role}</span></td>
            <td>${user.isVerified ? '<i class="fas fa-check-circle" style="color: var(--success);"></i>' : '<i class="fas fa-times-circle" style="color: var(--danger);"></i>'}</td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    ${user.role !== 'admin' ? `
                    <button class="btn btn-sm btn-primary" onclick="toggleUserRole('${user._id}', '${user.role}')">
                        <i class="fas fa-user-shield"></i> Make Admin
                    </button>
                    ` : '<span class="text-muted">Admin</span>'}
                </div>
            </td>
        </tr>
    `).join('');
}

async function toggleUserRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';

    if (!confirm(`Change user role to ${newRole}?`)) return;

    try {
        const response = await fetch(`${API_URL}/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ role: newRole })
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'success');
            loadUsers();
        } else {
            showToast(data.error || 'Failed to update role', 'error');
        }
    } catch (error) {
        console.error('Error updating role:', error);
        showToast('An error occurred', 'error');
    }
}

async function loadSubDetailIPOs() {
    try {
        const response = await fetch(`${API_URL}/ipos`);
        const data = await response.json();
        const ipos = data.ipos || [];

        const listContainer = document.getElementById('subDetailIPOsList');
        if (!ipos || ipos.length === 0) {
            listContainer.innerHTML = '<div class="text-center text-muted p-4">No IPOs found</div>';
            return;
        }

        listContainer.innerHTML = ipos.map(ipo => {
            const statusClass = `status-${ipo.status.toLowerCase()}`;
            return `
                <div class="sub-selection-row" data-id="${ipo._id}" onclick="selectIPOSub('${ipo._id}')">
                    <div class="ipo-name">${ipo.companyName}</div>
                    <div class="ipo-meta">
                        <span class="status-pill ${statusClass}">${ipo.status}</span>
                        <span>•</span>
                        <span>${ipo.category}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading sub detail IPOs:', error);
    }
}

async function selectIPOSub(ipoId) {
    const ipo = currentIPOs.find(i => i._id === ipoId);
    if (!ipo) return;

    // UI Updates
    document.querySelectorAll('.sub-selection-row').forEach(r => r.classList.remove('active-sub-row'));
    const selectedRow = document.querySelector(`.sub-selection-row[data-id="${ipoId}"]`);
    if (selectedRow) selectedRow.classList.add('active-sub-row');

    document.getElementById('subEditorPlaceholder').style.display = 'none';
    document.getElementById('subEditorContainer').style.display = 'block';

    // Populate Info
    document.getElementById('activeCompanyName').textContent = ipo.companyName;
    const subtitle = document.getElementById('activeIPOSubtitle');
    if (subtitle) {
        subtitle.textContent = `${ipo.category} • Sector: ${ipo.sector || 'N/A'}`;
    }
    document.getElementById('activeSubIpoId').value = ipoId;

    const sd = ipo.subscriptionDetails || {};
    const shares = sd.sharesOffered || {};
    const sharesSub = sd.sharesSubscribed || {};

    // Populate Shares Data
    document.getElementById('offeredQIB').value = shares.qib || '';
    document.getElementById('offeredNII').value = shares.nii || '';
    document.getElementById('offeredRetail').value = shares.retail || '';
    document.getElementById('offeredShareholder').value = shares.shareholder || '';

    // Populate Shares Subscribed Data
    document.getElementById('subscribedQIB').value = sharesSub.qib || '';
    document.getElementById('subscribedNII').value = sharesSub.nii || '';
    document.getElementById('subscribedRetail').value = sharesSub.retail || '';
    document.getElementById('subscribedShareholder').value = sharesSub.shareholder || '';

    // Applications Data
    document.getElementById('appOfferedQIB').value = (sd.qib && sd.qib.offered) || '';
    document.getElementById('appReceivedQIB').value = (sd.qib && sd.qib.received) || '';

    document.getElementById('appOfferedNII').value = (sd.nii && sd.nii.offered) || '';
    document.getElementById('appReceivedNII').value = (sd.nii && sd.nii.received) || '';

    document.getElementById('appOfferedRetail').value = (sd.retail && sd.retail.offered) || '';
    document.getElementById('appReceivedRetail').value = (sd.retail && sd.retail.received) || '';

    document.getElementById('appOfferedShareholder').value = (sd.shareholder && sd.shareholder.offered) || '';
    document.getElementById('appReceivedShareholder').value = (sd.shareholder && sd.shareholder.received) || '';

    updateMultiplierPreviews();
}

function setupSubTriggerListeners() {
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('sub-trigger')) {
            updateMultiplierPreviews();
        }
    });
}

function updateMultiplierPreviews() {
    const categories = ['QIB', 'NII', 'Retail', 'Shareholder'];
    categories.forEach(cat => {
        // Calculate Share Multiplier (Shares Subscribed / Shares Offered)
        const offered = parseFloat(document.getElementById(`offered${cat}`).value) || 0;
        const subscribed = parseFloat(document.getElementById(`subscribed${cat}`).value) || 0;
        const disp = document.getElementById(`sub${cat}_disp`);
        if (disp) {
            disp.value = (offered > 0) ? (subscribed / offered).toFixed(2) + 'x' : '0.00x';
        }
    });
}

function resetEditor() {
    document.getElementById('subEditorPlaceholder').style.display = 'block';
    document.getElementById('subEditorContainer').style.display = 'none';
    document.querySelectorAll('.sub-selection-row').forEach(r => r.classList.remove('active-sub-row'));
}

// Save Application Data Only
async function handleAppSubSubmit() {
    const ipoId = document.getElementById('activeSubIpoId').value;
    if (!ipoId) return;

    const btn = document.getElementById('saveAppSubBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
    btn.disabled = true;

    // Applications Data
    const qib = {
        offered: parseInt(document.getElementById('appOfferedQIB').value) || 0,
        received: parseInt(document.getElementById('appReceivedQIB').value) || 0
    };
    const nii = {
        offered: parseInt(document.getElementById('appOfferedNII').value) || 0,
        received: parseInt(document.getElementById('appReceivedNII').value) || 0
    };
    const retail = {
        offered: parseInt(document.getElementById('appOfferedRetail').value) || 0,
        received: parseInt(document.getElementById('appReceivedRetail').value) || 0
    };
    const shareholder = {
        offered: parseInt(document.getElementById('appOfferedShareholder').value) || 0,
        received: parseInt(document.getElementById('appReceivedShareholder').value) || 0
    };

    const formData = {
        subscriptionDetails: {
            qib: qib,
            nii: nii,
            retail: retail,
            shareholder: shareholder
        }
    };

    try {
        await sendSubscriptionUpdate(ipoId, formData);
        showToast('Application data saved successfully!', 'success');
    } catch (error) {
        console.error('App submit error:', error);
        showToast('Failed to save application data', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Save Share Data Only
async function handleShareSubSubmit() {
    const ipoId = document.getElementById('activeSubIpoId').value;
    if (!ipoId) return;

    const btn = document.getElementById('saveShareSubBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
    btn.disabled = true;

    // Calculate Multipliers based on SHARES
    const sharesQIB = {
        offered: parseFloat(document.getElementById('offeredQIB').value) || 0,
        subscribed: parseFloat(document.getElementById('subscribedQIB').value) || 0
    };
    const sharesNII = {
        offered: parseFloat(document.getElementById('offeredNII').value) || 0,
        subscribed: parseFloat(document.getElementById('subscribedNII').value) || 0
    };
    const sharesRetail = {
        offered: parseFloat(document.getElementById('offeredRetail').value) || 0,
        subscribed: parseFloat(document.getElementById('subscribedRetail').value) || 0
    };
    const sharesShareholder = {
        offered: parseFloat(document.getElementById('offeredShareholder').value) || 0,
        subscribed: parseFloat(document.getElementById('subscribedShareholder').value) || 0
    };

    // Calculate dynamic average for SHARES
    let totalMultiplier = 0;
    let activeCategoriesCount = 0;

    [sharesQIB, sharesNII, sharesRetail, sharesShareholder].forEach(cat => {
        if (cat.offered > 0) {
            totalMultiplier += (cat.subscribed / cat.offered);
            activeCategoriesCount++;
        }
    });
    const finalTotal = activeCategoriesCount > 0 ? (totalMultiplier / activeCategoriesCount) : 0;

    const formData = {
        subscription: {
            qib: sharesQIB.offered > 0 ? parseFloat((sharesQIB.subscribed / sharesQIB.offered).toFixed(2)) : 0,
            nii: sharesNII.offered > 0 ? parseFloat((sharesNII.subscribed / sharesNII.offered).toFixed(2)) : 0,
            retail: sharesRetail.offered > 0 ? parseFloat((sharesRetail.subscribed / sharesRetail.offered).toFixed(2)) : 0,
            shareholder: sharesShareholder.offered > 0 ? parseFloat((sharesShareholder.subscribed / sharesShareholder.offered).toFixed(2)) : 0,
            total: parseFloat(finalTotal.toFixed(2))
        },
        subscriptionDetails: {
            sharesOffered: {
                qib: sharesQIB.offered,
                nii: sharesNII.offered,
                retail: sharesRetail.offered,
                shareholder: sharesShareholder.offered
            },
            sharesSubscribed: {
                qib: sharesQIB.subscribed,
                nii: sharesNII.subscribed,
                retail: sharesRetail.subscribed,
                shareholder: sharesShareholder.subscribed
            }
        }
    };

    try {
        await sendSubscriptionUpdate(ipoId, formData);
        showToast('Share data & multipliers saved successfully!', 'success');
    } catch (error) {
        console.error('Share submit error:', error);
        showToast('Failed to save share data', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function sendSubscriptionUpdate(ipoId, formData) {
    const response = await fetch(`${API_URL}/admin/ipos/${ipoId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (response.ok) {
        await loadIPOs();
        await loadSubDetailIPOs();

        // Re-identify active row
        const rows = document.querySelectorAll('#subDetailTableBody tr');
        rows.forEach(r => {
            if (r.dataset.id === ipoId) r.classList.add('active-sub-row');
        });
    } else {
        throw new Error(result.error || 'Update failed');
    }
}

function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Global Exports
window.editIPO = editIPO;
window.deleteIPO = deleteIPO;
window.selectIPOSub = selectIPOSub;
window.resetEditor = resetEditor;
window.handleSubDetailSubmit = null; // Removed old handler
window.handleAppSubSubmit = handleAppSubSubmit;
window.handleShareSubSubmit = handleShareSubSubmit;
window.closeModal = closeModal;
window.openModal = openModal;
window.showToast = showToast;
window.toggleUserRole = toggleUserRole;
window.addGMP = addGMP;
window.updateListingPrice = updateListingPrice;

async function loadListingIPOs() {
    try {
        const response = await fetch(`${API_URL}/ipos`);
        const data = await response.json();
        const ipos = data.ipos || [];

        // Filter for IPOs that are eligible for listing (e.g., closed or upcoming, but NOT listed)
        // And usually listing happens after closing.
        const pendingIPOs = ipos.filter(ipo => ipo.status !== 'listed');

        const tbody = document.getElementById('listingTableBody');
        if (pendingIPOs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No pending listings found. All IPOs are listed.</td></tr>';
            return;
        }

        tbody.innerHTML = pendingIPOs.map(ipo => `
            <tr>
                <td>
                    <strong>${ipo.companyName}</strong>
                    <div class="small text-muted">${ipo.category}</div>
                </td>
                <td>₹${ipo.priceRange.max}</td>
                <td>${formatDate(ipo.closeDate)}</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="updateListingPrice('${ipo._id}')">
                        <i class="fas fa-check-circle"></i> Mark Listed
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading listing IPOs:', error);
    }
}

async function updateListingPrice(ipoId) {
    const ipo = currentIPOs.find(i => i._id === ipoId);
    if (!ipo) return;

    const listingPrice = prompt(`Enter Listing Price for ${ipo.companyName} (Issue Price: ₹${ipo.priceRange.max}):`);
    if (!listingPrice) return;

    const price = parseFloat(listingPrice);
    if (isNaN(price) || price <= 0) {
        showToast('Invalid price entered', 'error');
        return;
    }

    if (!confirm(`Confirm listing ${ipo.companyName} at ₹${price}? This will mark it as LISTED.`)) return;

    try {
        const response = await fetch(`${API_URL}/admin/ipos/${ipoId}/listing`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ listingPrice: price })
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'success');
            loadListingIPOs(); // Refresh list
            loadDashboardStats();
            // Also refresh main list if visible
            if (document.getElementById('section-ipos').classList.contains('active')) loadIPOs();
        } else {
            showToast(data.error || 'Failed to update listing', 'error');
        }
    } catch (error) {
        console.error('Error updating listing:', error);
        showToast('An error occurred', 'error');
    }
}
