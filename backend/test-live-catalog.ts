import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import { User } from './src/modules/users/user.model';
import { Product } from './src/modules/catalog/catalog.model';
import { Category } from './src/modules/catalog/catalog.model';
import { generateToken } from './src/utils/jwt';

dotenv.config();

const API_URL = 'http://localhost:5000/api';

async function run() {
  console.log("Starting Live Integration Audit...");
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("Connected to DB to setup users");
    
    // Admin user
    let admin = await User.findOne({ email: 'admin_audit@pmart.com' });
    if (!admin) {
        admin = await User.create({ email: 'admin_audit@pmart.com', passwordHash: 'password', name: 'Audit Admin', role: 'ADMIN' });
    }
    
    // Employee without catalog perm
    let emp = await User.findOne({ email: 'emp_audit@pmart.com' });
    if (!emp) {
        emp = await User.create({ email: 'emp_audit@pmart.com', passwordHash: 'password', name: 'Audit Emp', role: 'EMPLOYEE', permissions: [] });
    }
    
    const adminToken = generateToken({ id: admin._id, role: admin.role });
    const empToken = generateToken({ id: emp._id, role: emp.role });

    console.log("1. Create Category");
    let catRes = await axios.post(`${API_URL}/categories`, { name: 'Audit Veggies' }, { headers: { Authorization: `Bearer ${adminToken}` }});
    const categoryId = catRes.data.data._id;
    console.log("Category created:", catRes.status);

    console.log("2. Create Product");
    let res = await axios.post(`${API_URL}/products`, {
        name: "Audit Tomato", brand: "Farm", categorySlug: "audit-veggies",
        price: 40, mrp: 50, unit: "1 kg", weight: "1000g", image: "https://example.com/tomato.png",
        inStock: true, sku: "AUDIT-TOM-01", description: "Fresh"
    }, { headers: { Authorization: `Bearer ${adminToken}` }});
    const productId = res.data.data._id;
    console.log("Product created:", res.status);

    console.log("3. Edit Product");
    res = await axios.put(`${API_URL}/products/${productId}`, { price: 45 }, { headers: { Authorization: `Bearer ${adminToken}` }});
    console.log("Product updated:", res.status, res.data.data.price === 45 ? "Price updated" : "Failed");

    console.log("4. Change Status");
    res = await axios.patch(`${API_URL}/products/${productId}/status`, { inStock: false }, { headers: { Authorization: `Bearer ${adminToken}` }});
    console.log("Product status updated:", res.status, res.data.data.inStock === false ? "Status updated" : "Failed");

    console.log("5. Try as Employee without permission");
    try {
        await axios.post(`${API_URL}/products`, {
            name: "Audit Apple", brand: "Farm", categorySlug: "audit-veggies", price: 100, unit: "1 kg", inStock: true, sku: "AUDIT-APP-01"
        }, { headers: { Authorization: `Bearer ${empToken}` }});
        throw new Error("Employee succeeded but should fail");
    } catch(err) {
        console.log("Employee rejected as expected with code:", err.response.status);
    }

    console.log("6. Archive Product");
    res = await axios.delete(`${API_URL}/products/${productId}`, { headers: { Authorization: `Bearer ${adminToken}` }});
    console.log("Product archived:", res.status);

    console.log("7. Delete Category");
    res = await axios.delete(`${API_URL}/categories/${categoryId}`, { headers: { Authorization: `Bearer ${adminToken}` }});
    console.log("Category deleted:", res.status);

    // Cleanup
    await User.deleteMany({ email: { $in: ['admin_audit@pmart.com', 'emp_audit@pmart.com'] } });
    await Product.deleteMany({ sku: "AUDIT-TOM-01" });
    await Category.deleteMany({ _id: categoryId });
    
    console.log("Live Audit Completed Successfully.");
    process.exit(0);
  } catch (e) {
    console.error("Audit failed:", e?.response?.data || e.message);
    process.exit(1);
  }
}
run();
