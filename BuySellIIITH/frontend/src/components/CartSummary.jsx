import React from "react";
import "./CartSummary.css";

export const CartSummary = ({ items, onCheckout }) => {
    const validItems = items.filter(ci => ci.item && typeof ci.item.price === "number");

    const subtotal = validItems.reduce(
        (sum, ci) => sum + ci.item.price * ci.quantity,
        0
    );
    const shipping = subtotal > 0 ? 5.0 : 0;
    const total = subtotal + shipping;

    return (
        <div className="cart-summary">
            <h2>Order Summary</h2>
            <div className="row">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="row">
                <span>Shipping</span>
                <span>${shipping.toFixed(2)}</span>
            </div>
            <hr />
            <div className="row bold-row">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
            </div>
            <button onClick={onCheckout} disabled={validItems.length === 0}>
                Proceed to Checkout
            </button>
        </div>
    );
};
