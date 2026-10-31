// Food Court - Customer Website

let allFoods = [];
let cart = [];
let selectedCategory = "All";
let selectedType = "All";

let tableNumber = new URLSearchParams(window.location.search).get("table");

const tableSelect = document.getElementById("tableSelect");

// Create 50 table options
for (let i = 1; i <= 50; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = "Table " + i;
    tableSelect.appendChild(option);
}

// Select Table 1 by default if no table is in the URL
if (!tableNumber) {
    tableNumber = "1";
}

if (/^(?:[1-9]|[1-4][0-9]|50)$/.test(tableNumber)) {
    tableSelect.value = tableNumber;
} else {
    tableNumber = "";
}

// Update selected table
tableSelect.addEventListener("change", function () {
    tableNumber = this.value;
    tableInfo.dataset.selectedTable = tableNumber;
});

const foodContainer = document.getElementById("foodContainer");
const categoriesContainer = document.getElementById("categories");
const searchInput = document.getElementById("searchInput");
const cartButton = document.getElementById("cartButton");
const cartCount = document.getElementById("cartCount");
const tableInfo = document.getElementById("tableInfo");

// Show table number
if (tableNumber) {
    tableInfo.textContent = "Table: " + tableNumber;
} else {
    tableInfo.textContent = "Please scan your table QR code";
}

// Load menu from server
async function loadMenu() {
    try {
        const response = await fetch("/api/menu");

        if (!response.ok) {
            throw new Error("Could not load menu");
        }

        const data = await response.json();

        allFoods = Array.isArray(data) ? data : data.menu || [];

        showCategories();
        displayFoods();

    } catch (error) {
        foodContainer.textContent =
            "Menu could not load. Please check whether the server is running.";
        console.error(error);
    }
}

// Show menu categories
function showCategories() {
    const categoryNames = [
        "All",
        ...new Set(allFoods.map(food => food.category))
    ];

    categoriesContainer.innerHTML = "";

    categoryNames.forEach(category => {
        const button = document.createElement("button");
        button.textContent = category;

        if (category === selectedCategory) {
            button.classList.add("active");
        }

        button.addEventListener("click", () => {
            selectedCategory = category;
            showCategories();
            displayFoods();
        });

        categoriesContainer.appendChild(button);
    });
}

// Display food items
function displayFoods() {
    const searchText = searchInput.value.toLowerCase();

    const filteredFoods = allFoods.filter(food => {
        const matchesCategory =
            selectedCategory === "All" ||
            food.category === selectedCategory;

        const matchesType =
            selectedType === "All" ||
            food.foodType === selectedType;

        const matchesSearch =
            food.name.toLowerCase().includes(searchText);

        return matchesCategory && matchesType && matchesSearch &&
            food.available !== false;
    });

    foodContainer.innerHTML = "";

    if (filteredFoods.length === 0) {
        foodContainer.textContent = "No food items found.";
        return;
    }

    filteredFoods.forEach(food => {
        const card = document.createElement("div");
        card.className = "food-card";

        const image = document.createElement("img");
        image.src = food.image || "images/logo.jpeg";
        image.alt = food.name;
        image.onerror = () => {
            image.src = "images/logo.jpeg";
        };

        const details = document.createElement("div");
        details.className = "food-details";

        const name = document.createElement("h3");
        name.textContent = food.name;

        const description = document.createElement("p");
        description.textContent = food.description || "";

        const type = document.createElement("p");
        type.textContent = food.foodType || "";

        const price = document.createElement("h3");
        price.textContent = "₹" + food.price;

        const prepTime = document.createElement("p");
        prepTime.textContent =
            "Preparation time: " + food.prepTime + " minutes";

        const addButton = document.createElement("button");
        addButton.textContent = "Add to Cart";
        addButton.addEventListener("click", () => {
            addToCart(food.id);
        });

        details.append(name, description, type, price, prepTime, addButton);
        card.append(image, details);
        foodContainer.appendChild(card);
    });
}

// Search food
searchInput.addEventListener("input", displayFoods);

// Veg and Non-Veg filters
document.querySelectorAll(".food-filters button").forEach(button => {
    button.addEventListener("click", () => {
        selectedType = button.dataset.type;

        document.querySelectorAll(".food-filters button")
            .forEach(item => item.classList.remove("active"));

        button.classList.add("active");
        displayFoods();
    });
});

// Add food to cart
function addToCart(foodId) {
    const food = allFoods.find(item => String(item.id) === String(foodId));

    if (!food) return;

    const existingItem = cart.find(
        item => String(item.id) === String(foodId)
    );

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...food, quantity: 1 });
    }

    updateCartCount();
    alert(food.name + " added to cart!");
}

// Update cart count
function updateCartCount() {
    const totalItems = cart.reduce(
        (total, item) => total + item.quantity, 0
    );

    cartCount.textContent = totalItems;
}

// Create cart window
function createCartWindow() {
    let cartWindow = document.getElementById("cartWindow");

    if (cartWindow) {
        cartWindow.remove();
    }

    cartWindow = document.createElement("div");
    cartWindow.id = "cartWindow";
    cartWindow.className = "cart-window";

    cartWindow.innerHTML = `
        <div class="cart-content">
            <button id="closeCart" class="close-button">✖</button>
            <h2>Your Cart</h2>
            <div id="cartItems"></div>
            <h3 id="cartTotal"></h3>
            <button id="checkoutButton">Proceed to Order</button>
        </div>
    `;

    document.body.appendChild(cartWindow);

    document.getElementById("closeCart").onclick = () => {
        cartWindow.remove();
    };

    document.getElementById("checkoutButton").onclick = showCheckout;

    displayCartItems();
}

// Display cart items
function displayCartItems() {
    const cartItems = document.getElementById("cartItems");
    const cartTotal = document.getElementById("cartTotal");

    if (!cartItems) return;

    cartItems.innerHTML = "";

    if (cart.length === 0) {
        cartItems.textContent = "Your cart is empty.";
        cartTotal.textContent = "Total: ₹0";
        return;
    }

    cart.forEach(item => {
        const row = document.createElement("div");
        row.className = "cart-row";

        const itemName = document.createElement("span");
        itemName.textContent =
            item.name + " - ₹" + item.price;

        const decrease = document.createElement("button");
        decrease.textContent = "-";
        decrease.onclick = () => changeQuantity(item.id, -1);

        const quantity = document.createElement("span");
        quantity.textContent = item.quantity;

        const increase = document.createElement("button");
        increase.textContent = "+";
        increase.onclick = () => changeQuantity(item.id, 1);

        row.append(itemName, decrease, quantity, increase);
        cartItems.appendChild(row);
    });

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    cartTotal.textContent = "Total: ₹" + total;
}

// Change quantity
function changeQuantity(foodId, amount) {
    const item = cart.find(
        food => String(food.id) === String(foodId)
    );

    if (!item) return;

    item.quantity += amount;

    if (item.quantity <= 0) {
        cart = cart.filter(
            food => String(food.id) !== String(foodId)
        );
    }

    updateCartCount();
    displayCartItems();
}

// Open cart
cartButton.addEventListener("click", createCartWindow);

// Show checkout form
function showCheckout() {
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    const cartWindow = document.getElementById("cartWindow");

    cartWindow.innerHTML = `
        <div class="cart-content">
            <h2>Checkout</h2>
            <p>Table Number: ${tableNumber || "Not detected"}</p>

            <input id="customerName" placeholder="Enter your name">
            <input id="customerPhone" placeholder="Enter phone number">

            <h3>Select Payment Method</h3>
            <label>
                <input type="radio" name="payment" value="UPI" checked>
                UPI
            </label>
            <label>
                <input type="radio" name="payment" value="Cash">
                Cash
            </label>

            <button id="placeOrderButton">Place Order</button>
            <button id="backToCartButton">Back to Cart</button>
        </div>
    `;

    document.getElementById("placeOrderButton").onclick = placeOrder;
    document.getElementById("backToCartButton").onclick = createCartWindow;
}

// Place order
async function placeOrder() {
    if (!tableNumber) {
        alert("Please scan the QR code on your table before ordering.");
        return;
    }

    const name = document.getElementById("customerName").value.trim();
    const phone = document.getElementById("customerPhone").value.trim();
    const paymentMethod =
        document.querySelector('input[name="payment"]:checked').value;

    if (!name || !phone) {
        alert("Please enter your name and phone number.");
        return;
    }

    const orderData = {
        name,
        phone,
        table: tableNumber,
        paymentMethod,
        items: cart.map(item => ({
            id: item.id,
            quantity: item.quantity
        }))
    };

    try {
        const response = await fetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Order failed");
        }

        cart = [];
        updateCartCount();

        document.getElementById("cartWindow").innerHTML = `
            <div class="cart-content">
                <h2>Order Placed Successfully!</h2>
                <p>Order Number: ${result.orderId || result.id || "Check server response"}</p>
                <p>Payment: ${paymentMethod}</p>
                <p>UPI orders will remain awaiting verification until payment is confirmed.</p>
                <p>Thank you for ordering from Food Court!</p>
                <button onclick="document.getElementById('cartWindow').remove()">
                    Close
                </button>
            </div>
        `;

    } catch (error) {
        alert(error.message);
        console.error(error);
    }
}

// Track order
document.getElementById("trackBtn").addEventListener("click", trackOrder);

async function trackOrder() {
    const orderId = document.getElementById("trackId").value.trim();
    const resultBox = document.getElementById("trackingResult");

    if (!orderId) {
        resultBox.textContent = "Please enter your order number.";
        return;
    }

    try {
        const response = await fetch(
            "/api/orders/" + encodeURIComponent(orderId)
        );

        const order = await response.json();

        if (!response.ok) {
            throw new Error(order.message || "Order not found");
        }

        resultBox.textContent =
            "Order Status: " + (order.status || "Pending");

    } catch (error) {
        resultBox.textContent = error.message;
    }
}

// Start website
loadMenu();
