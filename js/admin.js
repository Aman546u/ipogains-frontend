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
        const response = await fetch(`${API_URL}/ipos?limit=100`);
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

    tbody.innerHTML = ipos.map(ipo => {
        const status = Helpers.calculateDisplayStatus(ipo);
        return `
        <tr>
            <td><strong>${ipo.companyName}</strong></td>
            <td><span class="ipo-category">${ipo.category || '—'}</span></td>
            <td>${ipo.priceRange?.min ? '₹' + ipo.priceRange.min : '—'} - ${ipo.priceRange?.max ? '₹' + ipo.priceRange.max : '—'}</td>
            <td><span class="status-badge status-${status.toLowerCase()}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
            <td>${Helpers.formatDate(ipo.openDate)}</td>
            <td>${Helpers.formatDate(ipo.closeDate)}</td>
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
    `}).join('');
}

async function handleIPOSubmit(e) {
    e.preventDefault();

    try {
        const getVal = (id) => {
            const el = document.getElementById(id);
            return el ? el.value : '';
        };

        const priceMax = parseFloat(getVal('priceMax')) || 0;
        const lotSize = parseInt(getVal('lotSize')) || 0;
        const priceMin = parseFloat(getVal('priceMin')) || 0;
        const minInv = parseFloat(getVal('minInvestment')) || (priceMax * lotSize);

        const formData = {
            companyName: getVal('companyName'),
            companyLogo: getVal('companyLogo').trim(),
            category: getVal('category'),
            sector: getVal('sector'),
            issueSize: parseFloat(getVal('issueSize')) || 0,
            priceRange: {
                min: priceMin,
                max: priceMax
            },
            lotSize: lotSize,
            minInvestment: minInv,
            openDate: getVal('openDate') || null,
            closeDate: getVal('closeDate') || null,
            allotmentDate: getVal('allotmentDate') || null,
            listingDate: getVal('listingDate') || null,
            registrar: getVal('registrar'),
            allotmentLink: getVal('allotmentLink').trim(),
            faceValue: parseFloat(getVal('faceValue')) || 0
        };

        // Validation
        const requiredFields = ['companyName'];
        const missingField = requiredFields.find(field => !formData[field]);

        if (missingField) {
            showToast(`Please fill all required fields (${missingField})`, 'error');
            return;
        }

        const url = editingIPOId
            ? `${API_URL}/admin/ipos/${editingIPOId}`
            : `${API_URL}/admin/ipos`;

        const method = editingIPOId ? 'PUT' : 'POST';

        const btn = document.querySelector('button[form="ipoForm"]');
        const originalText = btn ? btn.innerText : 'Save IPO';
        if (btn) {
            btn.innerText = 'Saving...';
            btn.disabled = true;
        }

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
            closeModal('ipoFormModal'); // Close FIRST

            showToast(data.message || 'IPO created/updated successfully', 'success');

            if (btn) {
                btn.innerText = originalText;
                btn.disabled = false;
            }

            // Non-blocking UI updates
            loadIPOs().catch(e => console.error('Load IPOs error:', e));
            loadDashboardStats().catch(e => console.error('Load Stats error:', e));
            loadSubDetailIPOs().catch(e => console.error('Load SubDetails error:', e));

            return;
        } else {
            showToast(data.error || 'Failed to save IPO', 'error');
        }

        if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    } catch (error) {
        console.error('Error saving IPO:', error);
        showToast('An error occurred: ' + error.message, 'error');

        const btn = document.querySelector('button[form="ipoForm"]');
        if (btn) {
            btn.innerText = 'Save IPO'; // Reset text
            btn.disabled = false;
        }
    }
}

async function editIPO(ipoId) {
    const ipo = currentIPOs.find(i => i._id === ipoId);
    if (!ipo) return;

    editingIPOId = ipoId;
    document.getElementById('ipoFormTitle').textContent = 'Edit IPO';

    document.getElementById('companyName').value = ipo.companyName;
    document.getElementById('companyLogo').value = ipo.companyLogo || '';
    document.getElementById('category').value = ipo.category || 'Mainboard';
    document.getElementById('sector').value = ipo.sector || '';
    document.getElementById('issueSize').value = ipo.issueSize || '';
    document.getElementById('priceMin').value = ipo.priceRange?.min || '';
    document.getElementById('priceMax').value = ipo.priceRange?.max || '';
    document.getElementById('lotSize').value = ipo.lotSize || '';
    document.getElementById('minInvestment').value = ipo.minInvestment || '';

    document.getElementById('openDate').value = ipo.openDate ? ipo.openDate.split('T')[0] : '';
    document.getElementById('closeDate').value = ipo.closeDate ? ipo.closeDate.split('T')[0] : '';
    document.getElementById('allotmentDate').value = ipo.allotmentDate ? ipo.allotmentDate.split('T')[0] : '';
    document.getElementById('listingDate').value = ipo.listingDate ? ipo.listingDate.split('T')[0] : '';
    document.getElementById('registrar').value = ipo.registrar || '';
    document.getElementById('allotmentLink').value = ipo.allotmentLink || ''; // Populate Registrar Link
    document.getElementById('faceValue').value = ipo.faceValue || '';

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
            showToast(data.message || 'GMP successfully updated! Notification sent.', 'success');
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
            <td>${Helpers.formatDate(user.createdAt)}</td>
            <td>
                <div class="action-buttons" style="display: flex; gap: 8px;">
                     <button class="btn btn-sm ${user.role === 'admin' ? 'btn-outline' : 'btn-primary'}" 
                            onclick="toggleUserRole('${user._id}', '${user.role}')" 
                            title="${user.role === 'admin' ? 'Remove Admin Access' : 'Make Admin'}">
                        <i class="fas fa-user-shield"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${user._id}')" title="Delete User">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function toggleUserRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const action = newRole === 'admin' ? 'promote this user to Admin' : 'remove Admin access from this user';

    if (!confirm(`Are you sure you want to ${action}?`)) return;

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

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'success');
            loadUsers();
            loadDashboardStats();
        } else {
            showToast(data.error || 'Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('An error occurred', 'error');
    }
}

async function loadSubDetailIPOs() {
    try {
        const response = await fetch(`${API_URL}/ipos`);
        const data = await response.json();
        const ipos = data.ipos || [];

        const listContainer = document.getElementById('subDetailIPOsList');
        if (!listContainer) return; // Guard clause

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

    // Populate Preferences
    document.getElementById('sharesUnitSelect').value = sd.sharesUnit || 'Lakhs';
    document.getElementById('includeShareholder').checked = sd.showShareholderCategory || false;

    // Toggle Shareholder visibility in form for better UX (optional but good)
    toggleShareholderInputVisibility();

    updateMultiplierPreviews();
}

function setupSubTriggerListeners() {
    // Input changes
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('sub-trigger')) {
            updateMultiplierPreviews();
        }
    });

    // Toggle options changes
    document.getElementById('includeShareholder')?.addEventListener('change', () => {
        toggleShareholderInputVisibility();
        updateMultiplierPreviews();
    });
}

function toggleShareholderInputVisibility() {
    const isChecked = document.getElementById('includeShareholder').checked;
    const row = document.getElementById('offeredShareholder').closest('.row');
    if (row) {
        row.style.opacity = isChecked ? '1' : '0.5';
        // We do not hide it completely so admin can still see/edit if needed, but visually dimmed
    }
}

function updateMultiplierPreviews() {
    const categories = ['QIB', 'NII', 'Retail', 'Shareholder'];
    const showShareholder = document.getElementById('includeShareholder').checked;

    let totalOffered = 0;
    let totalSubscribed = 0;

    categories.forEach(cat => {
        // Calculate Share Multiplier (Shares Subscribed / Shares Offered)
        const offered = parseFloat(document.getElementById(`offered${cat}`).value) || 0;
        const subscribed = parseFloat(document.getElementById(`subscribed${cat}`).value) || 0;
        const disp = document.getElementById(`sub${cat}_disp`);
        if (disp) {
            disp.value = (offered > 0) ? (subscribed / offered).toFixed(2) + 'x' : '0.00x';
        }

        // Accumulate Totals
        // Include Shareholder only if enabled
        if (cat === 'Shareholder' && !showShareholder) {
            return;
        }

        totalOffered += offered;
        totalSubscribed += subscribed;
    });

    // Update Total Display
    const totalDisp = document.getElementById('subTotal_disp');
    const totalOfferedDisplay = document.getElementById('totalOffered_disp');
    const totalSubscribedDisplay = document.getElementById('totalSubscribed_disp');

    if (totalDisp) {
        const totalVal = (totalOffered > 0) ? (totalSubscribed / totalOffered).toFixed(2) + 'x' : '0.00x';
        totalDisp.value = totalVal;
    }

    if (totalOfferedDisplay) totalOfferedDisplay.textContent = totalOffered > 0 ? totalOffered.toLocaleString('en-IN') : '-';
    if (totalSubscribedDisplay) totalSubscribedDisplay.textContent = totalSubscribed > 0 ? totalSubscribed.toLocaleString('en-IN') : '-';
}

function resetEditor() {
    document.getElementById('subEditorPlaceholder').style.display = 'block';
    document.getElementById('subEditorContainer').style.display = 'none';
    document.querySelectorAll('.sub-selection-row').forEach(r => r.classList.remove('active-sub-row'));
}

// Save Share Data Only
async function handleShareSubSubmit() {
    const ipoId = document.getElementById('activeSubIpoId').value;
    if (!ipoId) return;

    const btn = document.getElementById('saveShareSubBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
    btn.disabled = true;

    // Get Preferences
    const sharesUnit = document.getElementById('sharesUnitSelect').value;
    const showShareholder = document.getElementById('includeShareholder').checked;

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

    // Calculate Correct Total: (Total Subscribed / Total Offered)
    let totalOffered = sharesQIB.offered + sharesNII.offered + sharesRetail.offered;
    let totalSubscribed = sharesQIB.subscribed + sharesNII.subscribed + sharesRetail.subscribed;

    // Only include Shareholder if enabled
    if (showShareholder) {
        totalOffered += sharesShareholder.offered;
        totalSubscribed += sharesShareholder.subscribed;
    }

    const finalTotal = totalOffered > 0 ? (totalSubscribed / totalOffered) : 0;

    const formData = {
        subscription: {
            qib: sharesQIB.offered > 0 ? parseFloat((sharesQIB.subscribed / sharesQIB.offered).toFixed(2)) : 0,
            nii: sharesNII.offered > 0 ? parseFloat((sharesNII.subscribed / sharesNII.offered).toFixed(2)) : 0,
            retail: sharesRetail.offered > 0 ? parseFloat((sharesRetail.subscribed / sharesRetail.offered).toFixed(2)) : 0,
            shareholder: sharesShareholder.offered > 0 ? parseFloat((sharesShareholder.subscribed / sharesShareholder.offered).toFixed(2)) : 0,
            total: parseFloat(finalTotal.toFixed(2))
        },
        subscriptionDetails: {
            sharesUnit: sharesUnit,
            showShareholderCategory: showShareholder,
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
        // Wait for DOM update
        setTimeout(() => {
            const selectedRow = document.querySelector(`.sub-selection-row[data-id="${ipoId}"]`);
            if (selectedRow) selectedRow.classList.add('active-sub-row');
        }, 100);
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
                <td>${Helpers.formatDate(ipo.closeDate)}</td>
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

// --- NEWS MANAGER LOGIC ---

async function loadNewsList() {
    try {
        const response = await fetch(`${API_URL}/news`);
        const data = await response.json();

        displayNewsTable(data.news || []);
    } catch (error) {
        console.error('Error loading news:', error);
        document.getElementById('newsTableBody').innerHTML = '<tr><td colspan="4" class="text-center text-danger">Failed to load news</td></tr>';
    }
}

function displayNewsTable(newsItems) {
    const tbody = document.getElementById('newsTableBody');

    if (newsItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No news articles found.</td></tr>';
        return;
    }

    tbody.innerHTML = newsItems.map(item => `
        <tr>
            <td>
                <div class="font-weight-bold">${item.title}</div>
                <div class="small text-muted">${item.slug}</div>
            </td>
            <td><span class="badge badge-info">${item.category}</span></td>
            <td>${Helpers.formatDate(item.createdAt)}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editNews('${item._id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteNews('${item._id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

let editingNewsId = null;
let currentNewsList = [];

async function handleNewsSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('newsTitleInput').value;
    const category = document.getElementById('newsCategoryInput').value;
    const image = document.getElementById('newsImageInput').value;
    const summary = document.getElementById('newsSummaryInput').value;
    const content = document.getElementById('newsContentInput').value;

    if (!title || !summary || !content) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    const formData = { title, category, image, summary, content };
    const apiEndpoint = editingNewsId ? `${API_URL}/news/${editingNewsId}` : `${API_URL}/news`;
    const method = editingNewsId ? 'PUT' : 'POST';

    try {
        const response = await fetch(apiEndpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            showToast('News article saved successfully', 'success');
            closeModal('newsFormModal');
            loadNewsListRe();
        } else {
            showToast(data.error || 'Failed to save news', 'error');
        }
    } catch (error) {
        console.error('Error saving news:', error);
        showToast('Server error', 'error');
    }
}

async function loadNewsListRe() {
    try {
        const response = await fetch(`${API_URL}/news`);
        const data = await response.json();
        currentNewsList = data.news || [];
        displayNewsTable(currentNewsList);
    } catch (error) {
        console.error('Error loading news:', error);
    }
}

window.editNews = function (id) {
    const item = currentNewsList.find(n => n._id === id);
    if (!item) return;

    editingNewsId = id;
    document.getElementById('newsFormTitle').textContent = 'Edit News Article';
    document.getElementById('newsTitleInput').value = item.title;
    document.getElementById('newsCategoryInput').value = item.category;
    document.getElementById('newsImageInput').value = item.image;
    document.getElementById('newsSummaryInput').value = item.summary;
    document.getElementById('newsContentInput').value = item.content;

    openModal('newsFormModal');
};

window.deleteNews = async function (id) {
    if (!confirm('Are you sure you want to delete this news article?')) return;

    try {
        const response = await fetch(`${API_URL}/news/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            showToast('News deleted successfully', 'success');
            loadNewsListRe();
        } else {
            showToast('Failed to delete news', 'error');
        }
    } catch (error) {
        showToast('Server error', 'error');
    }
};

// Initialize listeners
document.addEventListener('DOMContentLoaded', () => {
    // Add logic to existing navigation handler
    const newsLink = document.querySelector('a[data-section="news"]');
    if (newsLink) {
        newsLink.addEventListener('click', () => {
            loadNewsListRe();
        });
    }

    // Add button listeners
    const addNewsBtn = document.getElementById('addNewsBtn');
    if (addNewsBtn) {
        addNewsBtn.addEventListener('click', () => {
            editingNewsId = null;
            document.getElementById('newsFormTitle').textContent = 'Add News Article';
            document.getElementById('newsForm').reset();
            openModal('newsFormModal');
        });
    }

    const newsForm = document.getElementById('newsForm');
    if (newsForm) {
        newsForm.addEventListener('submit', handleNewsSubmit);
    }
});
