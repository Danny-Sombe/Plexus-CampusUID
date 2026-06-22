document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const API_PORT = 5000;
    const SERVER_OVERRIDE = localStorage.getItem('serverHost');
    const API_BASE = SERVER_OVERRIDE
        ? (SERVER_OVERRIDE.match(/^https?:\/\//) ? SERVER_OVERRIDE : `http://${SERVER_OVERRIDE}`)
        : (window.location.protocol === 'file:' ? `http://localhost:${API_PORT}` : `${window.location.protocol}//${window.location.hostname}:${API_PORT}`);

    try {
        const response = await fetch(`${API_BASE.replace(/\/$/, '')}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem("userEmail", email);
            alert("Login successful!");
            window.location.href = "dashboard.html"; // Redirect to dashboard or home page
        } else {
            alert("Login failed: " + data.message);
        }
    } catch (error) {
        console.error("Error during login:", error);
        alert("An error occurred during login.");
    }
});