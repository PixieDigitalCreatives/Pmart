const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const API_URL = 'http://localhost:5000/api';

async function runAudit() {
  console.log("Starting Live Audit...");
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB to setup users");
    
    const { User } = require('./src/modules/users/user.model');
    let admin = await User.findOne({ email: 'admin_audit@pmart.com' });
    if (!admin) {
        admin = await User.create({
            email: 'admin_audit@pmart.com',
            passwordHash: 'password', // fake
            name: 'Audit Admin',
            role: 'ADMIN'
        });
    }
    
    let emp = await User.findOne({ email: 'emp_audit@pmart.com' });
    if (!emp) {
        emp = await User.create({
            email: 'emp_audit@pmart.com',
            passwordHash: 'password',
            name: 'Audit Emp',
            role: 'EMPLOYEE',
            permissions: []
        });
    }

    const { generateToken } = require('./src/utils/jwt');
    const adminToken = generateToken({ id: admin._id, role: admin.role });
    const empToken = generateToken({ id: emp._id, role: emp.role });

    console.log("Generated tokens, executing live HTTP requests...");

    // 1. Create product as admin
    let res = await axios.post(`${API_URL}/products`, {
        name: "Audit Tomato",
        brand: "Farm",
        categorySlug: "vegetables",
        price: 40,
        mrp: 50,
        unit: "1 kg",
        weight: "1000g",
        image: "https://example.com/tomato.png",
        inStock: true,
        sku: "AUDIT-TOM-01",
        description: "Fresh"
    }, { headers: { Authorization: `Bearer ${adminToken}` }});
    console.log("Create product: ", res.status);
    const productId = res.data.data._id;

    // 2. Edit product
    res = await axios.put(`${API_URL}/products/${productId}`, {
        price: 45
    }, { headers: { Authorization: `Bearer ${adminToken}` }});
    console.log("Update product: ", res.status, res.data.data.price === 45 ? "Price updated" : "Failed");

    // 3. Change status
    res = await axios.patch(`${API_URL}/products/${productId}/status`, {
        inStock: false
    }, { headers: { Authorization: `Bearer ${adminToken}` }});
    console.log("Update status: ", res.status, res.data.data.inStock === false ? "Status updated" : "Failed");

    // 4. Archive product
    res = await axios.delete(`${API_URL}/products/${productId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log("Archive product: ", res.status);

    // 5. Try with emp without permission
    try {
        await axios.post(`${API_URL}/products`, {
            name: "Audit Apple",
            brand: "Farm",
            categorySlug: "fruits",
            price: 100,
            mrp: 120,
            unit: "1 kg",
            weight: "1000g",
            image: "https://example.com/apple.png",
            inStock: true,
            sku: "AUDIT-APP-01",
            description: "Fresh"
        }, { headers: { Authorization: `Bearer ${empToken}` }});
        console.error("Employee without permission succeeded (FAIL)");
    } catch(err) {
        console.log("Employee without perm rejected: ", err.response.status);
    }

    // Cleanup
    await User.deleteMany({ email: { $in: ['admin_audit@pmart.com', 'emp_audit@pmart.com'] } });
    const { Product } = require('./src/modules/catalog/catalog.model');
    await Product.deleteMany({ sku: "AUDIT-TOM-01" });
    const { AuditLog } = require('./src/modules/admin/audit.model');
    await AuditLog.deleteMany({ 'details.sku': "AUDIT-TOM-01" });
    
    console.log("Live Audit Completed Successfully.");
    process.exit(0);
  } catch (e) {
    console.error("Audit failed:", e?.response?.data || e.message);
    // Cleanup
    const { User } = require('./src/modules/users/user.model');
    const { Product } = require('./src/modules/catalog/catalog.model');
    await User.deleteMany({ email: { $in: ['admin_audit@pmart.com', 'emp_audit@pmart.com'] } });
    await Product.deleteMany({ sku: "AUDIT-TOM-01" });
    process.exit(1);
  }
}
runAudit();
