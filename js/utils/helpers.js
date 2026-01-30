// Helper Utility Functions

const Helpers = {
    // Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    },

    // Get initials from name
    getInitials(name) {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    },

    // Scroll to section
    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    },

    // Show toast notification
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, APP_CONFIG.TOAST_DURATION);
    },

    // Validate PAN card
    validatePAN(pan) {
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        return panRegex.test(pan.toUpperCase());
    },

    // Validate email
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Calculate generic status based on time
    calculateDisplayStatus(ipo) {
        if (!ipo) return 'upcoming';

        const now = new Date();

        // Helper to parse date string and set specific time
        // Handling potentially ISO strings or YYYY-MM-DD
        const getDateWithTime = (dateStr, hours, minutes) => {
            if (!dateStr) return null;
            const d = new Date(dateStr);
            d.setHours(hours, minutes, 0, 0);
            return d;
        };

        const listingDate = getDateWithTime(ipo.listingDate, 10, 0); // 10:00 AM
        const closeDate = getDateWithTime(ipo.closeDate, 16, 30);    // 4:30 PM
        const openDate = getDateWithTime(ipo.openDate, 10, 0);       // 10:00 AM

        // If explicitly marked as something else by admin/backend? 
        // We defer to the time-based logic requested by user.

        // 1. Listed Check
        if (listingDate && now >= listingDate) {
            return 'listed';
        }

        // 2. Closed Check (After 4:30 PM on closing date)
        // If it's NOT listed yet, but past close time
        if (closeDate && now >= closeDate) {
            return 'closed';
        }

        // 3. Open Check
        if (openDate && now >= openDate) {
            return 'open';
        }

        return 'upcoming';
    },

    // Generate FAQ content based on type and company name
    generateFAQ(type, companyName) {
        const faqs = {
            subscription: [
                {
                    q: `What is the live subscription status for ${companyName} IPO?`,
                    a: `The live subscription status for ${companyName} IPO is updated in real-time. This tracker shows participation from Qualified Institutional Buyers (QIB), Non-Institutional Investors (NII), and Retail Investors. High subscription usually indicates strong market demand.`
                },
                {
                    q: `How many times ${companyName} IPO is subscribed today?`,
                    a: `You can track the total subscription of ${companyName} IPO on this page. We update the numbers multiple times a day as per the data from NSE and BSE. Look for the "Overall Subscription" card above for the latest multiple.`
                },
                {
                    q: `What is the ${companyName} IPO Retail subscription status?`,
                    a: `Looking for ${companyName} IPO retail subscription? On the final day, retail investors usually show high interest. Our live subscription table above provides the exact number of times the retail portion is subscribed.`
                },
                {
                    q: `What is the minimum investment for ${companyName} IPO?`,
                    a: `The minimum investment for ${companyName} IPO depends on the lot size and the upper price band. Typically, for retail investors, it is around ₹14,000 to ₹15,000 per lot. Check the "IPO Details" table for the exact lot size.`
                },
                {
                    q: `Is ${companyName} IPO a good buy for listing gains?`,
                    a: `Whether ${companyName} IPO is a good buy depends on its fundamentals and the current Grey Market Premium (GMP). Review the subscription data here; if QIB and NII categories are heavily oversubscribed, it often signals strong listing potential.`
                },
                {
                    q: `When does the ${companyName} IPO subscription close?`,
                    a: `The ${companyName} IPO subscription usually closes at 5:00 PM on the final day of the issue. Ensure you place your bid before the deadline to avoid last-minute technical glitches.`
                },
                {
                    q: `Where can I find the ${companyName} IPO live tracker?`,
                    a: `IPOGains provides a real-time ${companyName} IPO live tracker on this page, combining share-wise and application-wise data for a comprehensive view.`
                },
                {
                    q: `How to check ${companyName} IPO subscription live data at NSE/BSE?`,
                    a: `You can check ${companyName} IPO live subscription data directly on this page. We aggregate data from both NSE and BSE to give you the most accurate and combined subscription figures updated every few minutes.`
                },
                {
                    q: `What is the subscription lot for ${companyName} IPO?`,
                    a: `The subscription lot for ${companyName} IPO is the minimum number of shares you must apply for. You can calculate the total application amount by multiplying the price per share with the lot size.`
                },
                {
                    q: `How many applications received for ${companyName} IPO?`,
                    a: `Track the exact number of applications received for ${companyName} IPO across retail and other categories in our participation table above. This helps in understanding the level of oversubscription.`
                }
            ],
            allotment: [
                {
                    q: `How to check ${companyName} IPO allotment status online?`,
                    a: `You can check the ${companyName} IPO allotment status on the registrar's website (like Link Intime or Kfintech) or right here on IPOGains using our Allotment Tracker. You will need your PAN number, Application number, or DP ID.`
                },
                {
                    q: `What is the ${companyName} IPO allotment date and time?`,
                    a: `The allotment for ${companyName} is expected to be finalized on the date mentioned in our details table above. It usually happens late evening or early morning the next day after the scheduled date.`
                },
                {
                    q: `How to check ${companyName} IPO allotment status with PAN card?`,
                    a: `Simply click the "Check Allotment Status Now" button, select ${companyName} from the list, enter your PAN card number, and click Search. Your status (Allotted or Not Allotted) will be displayed instantly.`
                },
                {
                    q: `Is ${companyName} IPO allotment out today?`,
                    a: `You can track if ${companyName} IPO allotment is out today by checking our live status bar. We update the allotment links as soon as they are activated by the registrar.`
                },
                {
                    q: `Why haven't I received the ${companyName} IPO allotment refund?`,
                    a: `If you weren't allotted ${companyName} shares, the bank will unblock your funds within 24-48 hours of the allotment date. If it takes longer, contact your bank's customer support or the IPO registrar.`
                },
                {
                    q: `What are my chances of getting ${companyName} IPO allotment?`,
                    a: `In cases of heavy oversubscription in the retail category, allotment is done via a lucky draw. If the retail portion is subscribed 20x, your chances are roughly 1 in 20 per application.`
                },
                {
                    q: `When will ${companyName} shares be credited to my demat account?`,
                    a: `If you are allotted shares of ${companyName}, they will be credited to your demat account one business day before the listing date.`
                },
                {
                    q: `Link for ${companyName} IPO allotment check.`,
                    a: `The official link for ${companyName} IPO allotment check is usually the registrar's portal (Link Intime, Kfintech, or Skyline). You can find the direct link on this page under the allotment section.`
                },
                {
                    q: `How to check ${companyName} IPO allotment in Kfintech or Link Intime?`,
                    a: `Most IPOs use either Link Intime or Kfintech as their registrar. You can visit their official allotment status page or use the IPOGains direct integration link above to check your ${companyName} status.`
                }
            ],
            gmp: [
                {
                    q: `What is ${companyName} IPO GMP today?`,
                    a: `The Grey Market Premium (GMP) for ${companyName} today can be found in our live tracker above. It represents the extra price investors are willing to pay over the issue price in the unregulated grey market.`
                },
                {
                    q: `What is the expected listing price of ${companyName} IPO?`,
                    a: `Based on the current GMP, the estimated listing price for ${companyName} is the Upper Price Band plus the GMP. For example, if the price is ₹100 and GMP is ₹50, the expected listing is ₹150.`
                },
                {
                    q: `What is ${companyName} IPO listing date and time?`,
                    a: `The ${companyName} IPO is scheduled to list on the stock exchanges (NSE/BSE) at 10:00 AM on the listing date shown in the summary. Trading usually starts after the pre-open session.`
                },
                {
                    q: `Is the ${companyName} Grey Market Premium reliable?`,
                    a: `While ${companyName} GMP provides a good indicator of market sentiment, it is unofficial and can change rapidly. Investors should always consider company fundamentals alongside GMP.`
                },
                {
                    q: `Why is ${companyName} IPO GMP falling?`,
                    a: `A drop in ${companyName} GMP can be due to overall market volatility, negative news regarding the sector, or lower-than-expected subscription numbers on the final day.`
                },
                {
                    q: `How to use the ${companyName} IPO GMP chart?`,
                    a: `The ${companyName} GMP chart above shows the trend over the last few days. An upward curve indicates increasing interest, while a downward curve might suggest cooling demand.`
                },
                {
                    q: `Where can I get daily ${companyName} IPO GMP updates?`,
                    a: `You can bookmark this page for daily ${companyName} IPO GMP updates. We track the grey market pulses to give you the most accurate estimations available.`
                },
                {
                    q: `Will ${companyName} IPO list at a premium?`,
                    a: `Currently, the positive ${companyName} GMP suggests a listing at a premium. However, market conditions on the day of listing will determine the final opening price.`
                },
                {
                    q: `What is the meaning of ${companyName} Kostak and Subject to Sauda?`,
                    a: `Kostak is the fixed profit you get by selling your application in the grey market, regardless of allotment. Subject to Sauda is the profit you get ONLY if you receive ${companyName} allotment.`
                }
            ]
        };
        return faqs[type] || [];
    },

    // Render FAQ to accordion
    renderFAQ(type, companyName, containerId) {
        const faqs = this.generateFAQ(type, companyName);
        const container = document.getElementById(containerId);
        const faqSection = document.getElementById('faqSection');

        if (!container || faqs.length === 0) return;

        // Set the section structure to match the user's requested layout
        if (faqSection) {
            faqSection.innerHTML = `
                <div class="faq-container py-5">
                    <div class="text-center mb-5">
                        <h2 style="font-size: 2.5rem; font-weight: 800; color: #fff;">Frequently Asked <span style="color: var(--primary-green);">Questions</span></h2>
                    </div>
                    <div class="accordion" id="${containerId}">
                        ${faqs.map((faq, index) => `
                            <div class="accordion-item mb-3" style="background: #111827 !important; border: 1px solid #1f2937 !important; border-radius: 12px !important; overflow: hidden; transition: all 0.3s ease;">
                                <h2 class="accordion-header" id="heading${index}">
                                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}" 
                                            aria-expanded="false" aria-controls="collapse${index}"
                                            style="background: transparent !important; color: #fff !important; font-weight: 600; padding: 1.5rem !important; box-shadow: none !important; font-size: 1.1rem; display: flex; justify-content: space-between; align-items: center;">
                                        <span class="faq-q-text" style="flex: 1;">${faq.q}</span>
                                        <div class="faq-icon-circle" style="width: 28px; height: 28px; border-radius: 50%; background: rgba(34, 197, 94, 0.1); display: flex; align-items: center; justify-content: center; margin-left: 15px; border: 1px solid rgba(34, 197, 94, 0.2);">
                                            <i class="fas fa-chevron-down" style="font-size: 0.8rem; color: var(--primary-green);"></i>
                                        </div>
                                    </button>
                                </h2>
                                <div id="collapse${index}" class="accordion-collapse collapse" aria-labelledby="heading${index}" data-bs-parent="#${containerId}">
                                    <div class="accordion-body" style="padding: 0 1.5rem 1.5rem 1.5rem !important; color: #9ca3af !important; line-height: 1.7; font-size: 1rem; border-top: none !important;">
                                        ${faq.a}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            faqSection.style.display = 'block';
        }
    }
};

// Make Helpers globally available
window.Helpers = Helpers;
