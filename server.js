const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
console.log("Admin username configured:", !!process.env.ADMIN_USERNAME);
console.log("Admin password configured:", !!process.env.ADMIN_PASSWORD);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Database files
const DB_FILE = path.join(__dirname, "data", "db.json");
const MENU_FILE = path.join(__dirname, "data", "menu.json");

// Read database
function readDB() {
    let data;

    if (fs.existsSync(DB_FILE)) {
        data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    } else {
        data = JSON.parse(fs.readFileSync(MENU_FILE, "utf8"));
    }

    if (Array.isArray(data)) {
        return {
            menu: data,
            orders: [],
            reviews: [],
            kitchenUsers: []
        };
    }

    data.menu = Array.isArray(data.menu) ? data.menu : [];
    data.orders = Array.isArray(data.orders) ? data.orders : [];
    data.reviews = Array.isArray(data.reviews) ? data.reviews : [];
    data.kitchenUsers = Array.isArray(data.kitchenUsers)
    ? data.kitchenUsers
    : [];

return data;
}

// Save database
function saveDB(data) {
    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(data, null, 2)
    );
}

// Admin login tokens
const adminTokens = new Set();
const kitchenTokens = new Set();

// Check admin login
function checkAdmin(req, res, next) {
    const authorization = req.headers.authorization || "";

    const token = authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : "";

    if (!token || !adminTokens.has(token)) {
        return res.status(401).json({
            message: "Please login as admin."
        });
    }

    next();
}
// Check Kitchen Team login
function checkKitchen(req, res, next) {
    const authorization = req.headers.authorization || "";

    const token = authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : "";

    if (!token || !kitchenTokens.has(token)) {
        return res.status(401).json({
            message: "Please login as Kitchen Team."
        });
    }

    next();
}

// Customer website
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Admin website
app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Get customer menu
app.get("/api/menu", (req, res) => {
    try {
        const db = readDB();
        res.json(db.menu);
    } catch (error) {
        console.error("Menu loading error:", error);
        res.status(500).json({
            message: "Could not load menu."
        });
    }
});

// Admin login
app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;

    if (
        !process.env.ADMIN_USERNAME ||
        !process.env.ADMIN_PASSWORD
    ) {
        return res.status(500).json({
            message: "Admin login is not configured."
        });
    }

    if (
        username !== process.env.ADMIN_USERNAME ||
        password !== process.env.ADMIN_PASSWORD
    ) {
        return res.status(401).json({
            message: "Incorrect username or password."
        });
    }

    const token = crypto.randomBytes(32).toString("hex");
    adminTokens.add(token);

    res.json({
        message: "Login successful.",
        token
    });
});
// Admin: Create Kitchen Team account
app.post("/api/admin/kitchen-users", checkAdmin, (req, res) => {
    try {
        const { username, password } = req.body;

        if (
            typeof username !== "string" ||
            typeof password !== "string" ||
            username.trim().length < 3 ||
            password.length < 8
        ) {
            return res.status(400).json({
                message: "Username needs 3 characters and password needs 8 characters."
            });
        }

        const db = readDB();

if (!Array.isArray(db.kitchenUsers)) {
    db.kitchenUsers = [];
}

const cleanUsername = username.trim();

        const exists = db.kitchenUsers.some(
            user => user.username.toLowerCase() === cleanUsername.toLowerCase()
        );

        if (exists) {
            return res.status(409).json({
                message: "Kitchen username already exists."
            });
        }

        const salt = crypto.randomBytes(16).toString("hex");

        const passwordHash = crypto.scryptSync(
            password,
            salt,
            64
        ).toString("hex");

        db.kitchenUsers.push({
            id: crypto.randomUUID(),
            username: cleanUsername,
            salt,
            passwordHash
        });

        saveDB(db);

        res.status(201).json({
            message: "Kitchen Team account created successfully."
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not create Kitchen Team account."
        });
    }
});
// Kitchen Team login
app.post("/api/kitchen/login", (req, res) => {
    try {
        const { username, password } = req.body;
        const db = readDB();

        const user = db.kitchenUsers.find(
            item => item.username.toLowerCase() ===
                String(username || "").trim().toLowerCase()
        );

        if (!user || typeof password !== "string") {
            return res.status(401).json({
                message: "Incorrect Kitchen Team username or password."
            });
        }

        const suppliedHash = crypto.scryptSync(
            password,
            user.salt,
            64
        );

        const savedHash = Buffer.from(user.passwordHash, "hex");

        if (
            suppliedHash.length !== savedHash.length ||
            !crypto.timingSafeEqual(suppliedHash, savedHash)
        ) {
            return res.status(401).json({
                message: "Incorrect Kitchen Team username or password."
            });
        }

        const token = crypto.randomBytes(32).toString("hex");
        kitchenTokens.add(token);

        res.json({
            message: "Kitchen Team login successful.",
            token
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Kitchen Team login failed."
        });
    }
});
// Admin: Get food items
app.get("/api/admin/menu", checkAdmin, (req, res) => {
    try {
        const db = readDB();
        res.json(db.menu);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not load food items."
        });
    }
});

// Admin: Add food item
app.post("/api/admin/menu", checkAdmin, (req, res) => {
    try {
        const db = readDB();

        const {
            name,
            category,
            foodType,
            description,
            price,
            prepTime,
            image
        } = req.body;

        if (
            !name ||
            !category ||
            !["Veg", "Non-Veg"].includes(foodType) ||
            !Number.isFinite(Number(price)) ||
            Number(price) <= 0 ||
            !Number.isFinite(Number(prepTime)) ||
            Number(prepTime) <= 0
        ) {
            return res.status(400).json({
                message: "Please enter valid food details."
            });
        }

        const newFood = {
            id: Date.now().toString(),
            name,
            category,
            foodType,
            description: description || "",
            price: Number(price),
            prepTime: Number(prepTime),
            rating: 0,
            ratingCount: 0,
            image: image || "",
            available: true
        };

        db.menu.push(newFood);
        saveDB(db);

        res.status(201).json({
            message: "Food item added successfully.",
            food: newFood
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not add food item."
        });
    }
});

// Admin: Edit food item
app.put("/api/admin/menu/:id", checkAdmin, (req, res) => {
    try {
        const db = readDB();

        const food = db.menu.find(
            item => String(item.id) === String(req.params.id)
        );

        if (!food) {
            return res.status(404).json({
                message: "Food item not found."
            });
        }

        const {
            name,
            category,
            foodType,
            description,
            price,
            prepTime,
            image,
            available
        } = req.body;

        if (name !== undefined) food.name = name;
        if (category !== undefined) food.category = category;

        if (foodType !== undefined) {
            if (!["Veg", "Non-Veg"].includes(foodType)) {
                return res.status(400).json({
                    message: "Invalid food type."
                });
            }
            food.foodType = foodType;
        }

        if (description !== undefined) {
            food.description = description;
        }

        if (price !== undefined) {
            if (
                !Number.isFinite(Number(price)) ||
                Number(price) <= 0
            ) {
                return res.status(400).json({
                    message: "Invalid food price."
                });
            }
            food.price = Number(price);
        }

        if (prepTime !== undefined) {
            if (
                !Number.isFinite(Number(prepTime)) ||
                Number(prepTime) <= 0
            ) {
                return res.status(400).json({
                    message: "Invalid preparation time."
                });
            }
            food.prepTime = Number(prepTime);
        }

        if (image !== undefined) food.image = image;

        if (typeof available === "boolean") {
            food.available = available;
        }

        saveDB(db);

        res.json({
            message: "Food item updated successfully.",
            food
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not update food item."
        });
    }
});

// Admin: Delete food item
app.delete("/api/admin/menu/:id", checkAdmin, (req, res) => {
    try {
        const db = readDB();
        const oldLength = db.menu.length;

        db.menu = db.menu.filter(
            item => String(item.id) !== String(req.params.id)
        );

        if (db.menu.length === oldLength) {
            return res.status(404).json({
                message: "Food item not found."
            });
        }

        saveDB(db);

        res.json({
            message: "Food item deleted successfully."
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not delete food item."
        });
    }
});

// Customer: Place order
app.post("/api/orders", (req, res) => {
    try {
        const db = readDB();

        const {
            name,
            phone,
            table,
            paymentMethod,
            items
        } = req.body;

        if (
            !name ||
            !phone ||
            !table ||
            !["UPI", "Cash"].includes(paymentMethod) ||
            !Array.isArray(items) ||
            items.length === 0
        ) {
            return res.status(400).json({
                message: "Please provide all order details."
            });
        }

        const tableNumber = Number(table);

        if (
            !Number.isInteger(tableNumber) ||
            tableNumber < 1 ||
            tableNumber > 50
        ) {
            return res.status(400).json({
                message: "Please select a valid table from 1 to 50."
            });
        }

        if (!/^[0-9]{10}$/.test(String(phone))) {
            return res.status(400).json({
                message: "Enter a valid 10-digit phone number."
            });
        }

        const orderItems = [];
        let total = 0;
        let maxPrepTime = 0;

        for (const requestedItem of items) {
            const food = db.menu.find(
                item => String(item.id) === String(requestedItem.id)
            );

            const quantity = Number(requestedItem.quantity);

            if (
                !food ||
                food.available === false ||
                !Number.isInteger(quantity) ||
                quantity < 1 ||
                quantity > 50
            ) {
                return res.status(400).json({
                    message: "An item is unavailable or has invalid quantity."
                });
            }

            orderItems.push({
                id: food.id,
                name: food.name,
                price: Number(food.price),
                quantity
            });

            total += Number(food.price) * quantity;

            maxPrepTime = Math.max(
                maxPrepTime,
                Number(food.prepTime) || 0
            );
        }
        const upiPaymentLink = paymentMethod === "UPI"
    ? `upi://pay?pa=${encodeURIComponent(process.env.UPI_ID)}&pn=Food%20Court&am=${total.toFixed(2)}&cu=INR&tn=Order%20${orderId}`
    : null;
        const orderId = "FC" + Date.now();

        const order = {
            id: orderId,
            orderId,
            name,
            phone,
            table: String(tableNumber),
            items: orderItems,
            total,
            prepTime: maxPrepTime,
            paymentMethod,
            paymentLink: upiPaymentLink,
            paymentStatus: paymentMethod === "UPI"
                ? "Awaiting Verification"
                : "Pay at Table",
            status: "Pending",
            createdAt: new Date().toISOString()
        };

        db.orders.push(order);
        saveDB(db);

        res.status(201).json({
    message: "Order placed successfully.",
    orderId,
    total,
    prepTime: maxPrepTime,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentLink: order.paymentLink
});
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not place order."
        });
    }
});

// Customer: Track order
app.get("/api/orders/:orderId", (req, res) => {
    try {
        const db = readDB();

        const order = db.orders.find(
            item =>
                String(item.id || item.orderId) ===
                String(req.params.orderId)
        );

        if (!order) {
            return res.status(404).json({
                message: "Order not found."
            });
        }

        res.json({
            orderId: order.orderId || order.id,
            status: order.status,
            paymentStatus: order.paymentStatus,
            prepTime: order.prepTime
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not track order."
        });
    }
});

// Admin: View orders
app.get("/api/admin/orders", checkAdmin, (req, res) => {
    try {
        const db = readDB();
        res.json(db.orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not load orders."
        });
    }
});

// Admin: Update order status
app.patch("/api/admin/orders/:id", checkAdmin, (req, res) => {
    try {
        const db = readDB();

        const order = db.orders.find(
            item =>
                String(item.id || item.orderId) ===
                String(req.params.id)
        );

        if (!order) {
            return res.status(404).json({
                message: "Order not found."
            });
        }

        const allowedStatuses = [
            "Pending",
            "Preparing",
            "Ready to Serve",
            "Completed"
        ];

        if (!allowedStatuses.includes(req.body.status)) {
            return res.status(400).json({
                message: "Invalid order status."
            });
        }

        order.status = req.body.status;
        saveDB(db);

        res.json({
            message: "Order status updated.",
            order
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not update order."
        });
    }
});
// Kitchen Team: View all orders
app.get("/api/kitchen/orders", checkKitchen, (req, res) => {
    try {
        const db = readDB();
        res.json(db.orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not load kitchen orders."
        });
    }
});

// Kitchen Team: Update order status
app.patch("/api/kitchen/orders/:id", checkKitchen, (req, res) => {
    try {
        const db = readDB();

        const order = db.orders.find(
            item =>
                String(item.id || item.orderId) ===
                String(req.params.id)
        );

        if (!order) {
            return res.status(404).json({
                message: "Order not found."
            });
        }

        const allowedStatuses = [
            "Pending",
            "Preparing",
            "Ready to Serve"
        ];

        if (!allowedStatuses.includes(req.body.status)) {
            return res.status(400).json({
                message: "Invalid order status."
            });
        }

        order.status = req.body.status;
        saveDB(db);

        res.json({
            message: "Kitchen order status updated.",
            order
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not update kitchen order."
        });
    }
});
// Start server
app.listen(PORT, () => {
    console.log("Food Court server is running!");
    console.log("Server port: " + PORT);
});
