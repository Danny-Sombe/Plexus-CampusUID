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