document.getElementById("forgot-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("forgot-email").value.trim();

    if (!email) {
        alert("Please enter your email address.");
        return;
    }

    try {
        const API_BASE = getApiBase(); // defined in config.js

        const response = await fetch(`${API_BASE.replace(/\/$/, '')}/forgot-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (!response.ok) {
            alert("Error: " + (data.message || "Unable to send reset link."));
            return;
        }

        if (data.success) {
            alert(data.message);
            window.location.href = "index.html";
        } else {
            alert("Error: " + (data.message || "Unable to send reset link."));
        }
    } catch (error) {
        console.error("Forgot password error:", error);
        alert("Unable to send reset link. Make sure the server is running and email is configured.");
    }
});
