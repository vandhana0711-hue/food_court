// Food Court - Admin Dashboard

let adminToken = sessionStorage.getItem("adminToken") || "";

const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loginMessage = document.getElementById("loginMessage");
const foodForm = document.getElementById("foodForm");

const API = "/api/admin";

// API request helper
async function adminRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(adminToken
                ? { "Authorization": "Bearer " + adminToken }
                : {}),
            ...options.headers
        }
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error("Please login again.");
    }

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}

// Admin Login
document.getElementById("loginButton").addEventListener("click", login);

async function login() {
    const username =
        document.getElementById("adminUsername").value.trim();

    const password =
        document.getElementById("adminPassword").value;

    if (!username || !password) {
        loginMessage.textContent = "Enter username and password.";
        return;
    }

    try {
        const response = await fetch(API + "/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Login failed.");
        }

        adminToken = data.token;
        sessionStorage.setItem("adminToken", adminToken);

        showDashboard();

    } catch (error) {
        loginMessage.textContent = error.message;
    }
}

// Show Dashboard
function showDashboard() {
    loginSection.style.display = "none";
    dashboardSection.style.display = "block";

    loadAdminFoods();
    loadAdminOrders();
}

// Logout
document.getElementById("logoutButton").addEventListener("click", logout);

function logout() {
    adminToken = "";
    sessionStorage.removeItem("adminToken");

    dashboardSection.style.display = "none";
    loginSection.style.display = "block";
}

// Load Food Items
async function loadAdminFoods() {
    const foodList = document.getElementById("adminFoodList");

    try {
        const data = await adminRequest(API + "/menu");

        const foods = Array.isArray(data) ? data : data.menu || [];

        foodList.innerHTML = "";

        if (foods.length === 0) {
            foodList.textContent = "No food items found.";
            return;
        }

        foods.forEach(food => {
            const item = document.createElement("div");
            item.className = "admin-item";

            const name = document.createElement("h3");
            name.textContent = food.name;

            const details = document.createElement("p");
            details.textContent =
                food.category + " | " + food.foodType +
                " | ₹" + food.price +
                " | " + food.prepTime + " minutes";

            const availability = document.createElement("p");
            availability.textContent =
                food.available === false ? "Unavailable" : "Available";

            const editButton = document.createElement("button");
            editButton.className = "edit-button";
            editButton.textContent = "Edit";
            editButton.onclick = () => editFood(food);

            const deleteButton = document.createElement("button");
            deleteButton.className = "delete-button";
            deleteButton.textContent = "Delete";
            deleteButton.onclick = () => deleteFood(food.id);

            const availabilityButton = document.createElement("button");
            availabilityButton.textContent =
                food.available === false ? "Make Available" : "Make Unavailable";

            availabilityButton.onclick = () =>
                changeAvailability(food);

            item.append(
                name,
                details,
                availability,
                editButton,
                deleteButton,
                availabilityButton
            );

            foodList.appendChild(item);
        });

    } catch (error) {
        foodList.textContent = error.message;
    }
}

// Add or Edit Food Item
foodForm.addEventListener("submit", saveFood);

async function saveFood(event) {
    event.preventDefault();

    const id = document.getElementById("foodId").value;

    const food = {
        name: document.getElementById("foodName").value.trim(),
        category: document.getElementById("foodCategory").value,
        foodType: document.getElementById("foodType").value,
        description:
            document.getElementById("foodDescription").value.trim(),
        price: Number(document.getElementById("foodPrice").value),
        prepTime: Number(document.getElementById("foodPrepTime").value),
        image: document.getElementById("foodImage").value.trim()
    };

    try {
        if (id) {
            await adminRequest(API + "/menu/" + encodeURIComponent(id), {
                method: "PUT",
                body: JSON.stringify(food)
            });

            alert("Food item updated successfully!");
        } else {
            await adminRequest(API + "/menu", {
                method: "POST",
                body: JSON.stringify(food)
            });

            alert("New food item added successfully!");
        }

        clearFoodForm();
        loadAdminFoods();

    } catch (error) {
        alert(error.message);
    }
}

// Edit Food Item
function editFood(food) {
    document.getElementById("foodId").value = food.id;
    document.getElementById("foodName").value = food.name;
    document.getElementById("foodCategory").value = food.category;
    document.getElementById("foodType").value = food.foodType;
    document.getElementById("foodDescription").value =
        food.description || "";
    document.getElementById("foodPrice").value = food.price;
    document.getElementById("foodPrepTime").value = food.prepTime;
    document.getElementById("foodImage").value = food.image || "";

    document.getElementById("saveFoodButton").textContent =
        "Update Food Item";

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Clear Form
document.getElementById("cancelEditButton")
    .addEventListener("click", clearFoodForm);

function clearFoodForm() {
    foodForm.reset();

    document.getElementById("foodId").value = "";

    document.getElementById("saveFoodButton").textContent =
        "Add Food Item";
}

// Delete Food Item
async function deleteFood(id) {
    if (!confirm("Are you sure you want to delete this food item?")) {
        return;
    }

    try {
        await adminRequest(
            API + "/menu/" + encodeURIComponent(id),
            { method: "DELETE" }
        );

        alert("Food item deleted.");
        loadAdminFoods();

    } catch (error) {
        alert(error.message);
    }
}

// Change Food Availability
async function changeAvailability(food) {
    try {
        await adminRequest(
            API + "/menu/" + encodeURIComponent(food.id),
            {
                method: "PUT",
                body: JSON.stringify({
                    ...food,
                    available: food.available === false
                })
            }
        );

        loadAdminFoods();

    } catch (error) {
        alert(error.message);
    }
}

// Load Customer Orders
async function loadAdminOrders() {
    const orderList = document.getElementById("adminOrderList");

    try {
        const data = await adminRequest(API + "/orders");

        const orders = Array.isArray(data) ? data : data.orders || [];

        orderList.innerHTML = "";

        if (orders.length === 0) {
            orderList.textContent = "No customer orders yet.";
            return;
        }

        orders.forEach(order => {
            const card = document.createElement("div");
            card.className = "admin-order";

            const heading = document.createElement("h3");
            heading.textContent = "Order: " + (order.id || order.orderId);

            const customer = document.createElement("p");
            customer.textContent =
                "Customer: " + (order.name || "Not provided");

            const phone = document.createElement("p");
            phone.textContent =
                "Phone: " + (order.phone || "Not provided");

            const table = document.createElement("p");
            table.textContent =
                "Table: " + (order.table || "Not provided");

            const status = document.createElement("p");
            status.textContent =
                "Status: " + (order.status || "Pending");

            const payment = document.createElement("p");
            payment.textContent =
                "Payment: " + (order.paymentMethod || "Not provided") +
                " - " + (order.paymentStatus || "Pending");

            const total = document.createElement("p");
            total.textContent = "Total: ₹" + (order.total || 0);

            const items = document.createElement("p");
            items.textContent = "Items: " +
                (order.items || []).map(item =>
                    (item.name || "Food") + " x " + item.quantity
                ).join(", ");

            const statusSelect = document.createElement("select");

            [
                "Pending",
                "Preparing",
                "Ready to Serve",
                "Completed"
            ].forEach(value => {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = value;
                statusSelect.appendChild(option);
            });

            statusSelect.value = order.status || "Pending";

            const updateButton = document.createElement("button");
            updateButton.className = "status-button";
            updateButton.textContent = "Update Status";

            updateButton.onclick = async () => {
                try {
                    await adminRequest(
                        API + "/orders/" +
                        encodeURIComponent(order.id || order.orderId),
                        {
                            method: "PATCH",
                            body: JSON.stringify({
                                status: statusSelect.value
                            })
                        }
                    );

                    alert("Order status updated.");
                    loadAdminOrders();

                } catch (error) {
                    alert(error.message);
                }
            };

            card.append(
                heading, customer, phone, table,
                items, total, payment, status,
                statusSelect, updateButton
            );

            orderList.appendChild(card);
        });

    } catch (error) {
        orderList.textContent = error.message;
    }
}

// Restore login for current browser session
if (adminToken) {
    showDashboard();
}
