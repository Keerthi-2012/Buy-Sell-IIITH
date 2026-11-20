import React from "react";
import { rupees } from "../utils/api";
import "./CartSummary.css";

// Handover happens on campus (OTP at delivery), so there is no shipping fee.
export const CartSummary = ({ items, onCheckout }) => {
  const validItems = items.filter((ci) => ci.item && typeof ci.item.price === "number");
  const total = validItems.reduce((sum, ci) => sum + ci.item.price, 0);

  return (
    <div className="cart-summary">
      <h2>Order Summary</h2>
      <div className="row">
        <span>Items ({validItems.length})</span>
        <span>{rupees(total)}</span>
      </div>
      <hr />
      <div className="row bold-row">
        <span>Total</span>
        <span>{rupees(total)}</span>
      </div>
      <button onClick={onCheckout} disabled={validItems.length === 0}>
        Place Order
      </button>
    </div>
  );
};
