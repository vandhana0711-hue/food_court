// Food Court - Kitchen Team Dashboard

let kitchenToken = sessionStorage.getItem("kitchenToken") || "";

const loginSection = document.getElementById("kitchenLoginSection");
const dashboard = document.getElementById("kitchenDashboard");
const loginMessage = document.getElementById("kitchenLoginMessage");
const orderList = document.getElementById("kitchenOrderList");

// Kitchen API request helper
async function kitchenRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(kitchenToken
                ? { "Authorization": "Bearer " + kitchenToken }
                : {}),
            ...options.headers
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}

// Kitchen Team Login
document.getElementById("kitchenLoginButton")
    .addEventListener("click", kitchenLogin);

async function kitchenLogin() {
    const username =
        document.getElementById("kitchenUsername").value.trim();

    const password =
        document.getElementById("kitchenPassword").value;

    if (!username || !password) {
        loginMessage.textContent = "Enter username and password.";
        return;
    }

    try {
        const data = await kitchenRequest("/api/kitchen/login", {
            method: "POST",
            body: JSON.stringify({ username, password })
        });

        kitchenToken = data.token;
        sessionStorage.setItem("kitchenToken", kitchenToken);

        showKitchenDashboard();

    } catch (error) {
        loginMessage.textContent = error.message;
    }
}

// Show Kitchen Dashboard
function showKitchenDashboard() {
    loginSection.style.display = "none";
    dashboard.style.display = "block";
    loadKitchenOrders();
}

// Kitchen Logout
document.getElementById("kitchenLogoutButton")
    .addEventListener("click", kitchenLogout);

function kitchenLogout() {
    kitchenToken = "";
    sessionStorage.removeItem("kitchenToken");

    dashboard.style.display = "none";
    loginSection.style.display = "block";
}

// Load Orders
async function loadKitchenOrders() {
    try {
        const orders = await kitchenRequest("/api/kitchen/orders");

        orderList.innerHTML = "";

        if (!Array.isArray(orders) || orders.length === 0) {
            orderList.textContent = "No customer orders yet.";
            return;
        }

        orders.forEach(order => {
            const card = document.createElement("div");
            card.className = "admin-order";

            const heading = document.createElement("h3");
            heading.textContent = "Order: " + (order.id || order.orderId);

            const table = document.createElement("p");
            table.textContent = "Table: " + (order.table || "Not provided");

            const status = document.createElement("p");
            status.textContent = "Status: " + (order.status || "Pending");

            const prepTime = document.createElement("p");
            prepTime.textContent =
                "Preparation time: " + (order.prepTime || "Not provided") + " minutes";

            const items = document.createElement("p");
            items.textContent = "Items: " +
                (order.items || []).map(item =>
                    (item.name || "Food") + " x " + item.quantity
                ).join(", ");

            const statusSelect = document.createElement("select");

            ["Pending", "Preparing", "Ready to Serve"].forEach(value => {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = value;
                statusSelect.appendChild(option);
            });

            statusSelect.value = order.status || "Pending";

            const updateButton = document.createElement("button");
            updateButton.textContent = "Update Status";
            updateButton.className = "status-button";

            updateButton.addEventListener("click", async () => {
                try {
                    await kitchenRequest(
                        "/api/kitchen/orders/" +
                        encodeURIComponent(order.id || order.orderId),
                        {
                            method: "PATCH",
                            body: JSON.stringify({
                                status: statusSelect.value
                            })
                        }
                    );

                    alert("Order status updated!");
                    loadKitchenOrders();

                } catch (error) {
                    alert(error.message);
                }
            });

            card.append(
                heading,
                table,
                items,
                prepTime,
                status,
                statusSelect,
                updateButton
            );

            orderList.appendChild(card);
        });

    } catch (error) {
        orderList.textContent = error.message;
    }
}

// Restore current browser session
if (kitchenToken) {
    showKitchenDashboard();
}
