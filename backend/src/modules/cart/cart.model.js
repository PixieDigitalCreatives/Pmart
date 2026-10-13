'use strict';

const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, max: 99 }
  },
  { _id: false }
);

const CartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [CartItemSchema], default: [] }
  },
  { timestamps: true }
);

CartSchema.index({ user: 1 }, { unique: true });

const Cart = mongoose.model('Cart', CartSchema);

module.exports = { Cart };
