document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const API_BASE = getApiBase(); // defined in config.js

    try {
        const response = await fetch(`${API_BASE.replace(/\/$/, '')}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && data.success) {
            localStorage.setItem("userEmail", email);
            window.location.href = "dashboard.html"; // Redirect to dashboard or home page
        } else {
            alert("Login failed: " + (data.message || `server error ${response.status}`));
        }
    } catch (error) {
        console.error("Error during login:", error);
        alert(`Cannot connect to server: ${error.message}. The backend may be offline — check that it is deployed and running.`);
    }
});