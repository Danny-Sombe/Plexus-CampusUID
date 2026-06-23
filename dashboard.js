document.addEventListener("DOMContentLoaded", async () => {
    const API_BASE = getApiBase(); // defined in config.js
    const userEmail = localStorage.getItem("userEmail");

    if (!userEmail) {
        window.location.href = "index.html";
        return;
    }

    try {
        const response = await fetch(`${API_BASE.replace(/\/$/, '')}/profile?email=${encodeURIComponent(userEmail)}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || "Unable to load profile");
        }

        const { fullname, email, studentid } = data.user;
        document.getElementById("fullname").textContent = fullname || "-";
        document.getElementById("email").textContent = email || "-";
        document.getElementById("studentid").textContent = studentid || "-";

        // Fetch financial records
        if (studentid) {
            try {
                const financialResponse = await fetch(`${API_BASE.replace(/\/$/, '')}/financial-records?studentid=${encodeURIComponent(studentid)}`);
                const financialData = await financialResponse.json();

                if (financialData.success && financialData.records && financialData.records.length > 0) {
                    const container = document.getElementById("financialContainer");
                    const recordsHTML = financialData.records.map(record => `
                        <div class="financial-record">
                            <p><strong>Amount Paid:</strong> $${parseFloat(record.amount_paid).toFixed(2)}</p>
                            <p><strong>Payment Date:</strong> ${record.payment_date ? new Date(record.payment_date).toLocaleDateString() : 'N/A'}</p>
                        </div>
                    `).join("");
                    container.innerHTML = recordsHTML;
                } else {
                    document.getElementById("financialContainer").innerHTML = '<p class="muted">No financial records found.</p>';
                }
            } catch (finError) {
                console.error("Financial records fetch error:", finError);
                document.getElementById("financialContainer").innerHTML = '<p class="error-text">Unable to load financial records.</p>';
            }
        }
    } catch (error) {
        console.error("Dashboard load error:", error);
        localStorage.removeItem("userEmail");
        alert("Unable to load dashboard. Please sign in again.");
        window.location.href = "index.html";
    }

    const logoutButton = document.getElementById("logout-button");
    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem("userEmail");
            window.location.href = "index.html";
        });
    }
});
