import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { CartItem } from "./CartItem";
import { CartSummary } from "./CartSummary";
import { api, errorMessage } from "../utils/api";
import "./CartPage.css";

const CartPage = () => {
  const [cartItems, setCartItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/cart")
      .then((res) => setCartItems(res.data.items || []))
      .catch((err) => {
        toast.error(errorMessage(err, "Failed to fetch cart"));
        setCartItems([]);
      });
  }, []);

  const handleRemoveItem = async (itemId) => {
    try {
      const res = await api.post("/cart/remove", { itemId });
      setCartItems(res.data.cart.items || []);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to remove item"));
    }
  };

  const handleCheckout = async () => {
    try {
      await api.post("/order/checkout", {});
      toast.success("Order placed! Your delivery OTPs are on the Orders page.");
      setCartItems([]);
      navigate("/orders");
    } catch (err) {
      toast.error(errorMessage(err, "Checkout failed"));
    }
  };

  return (
    <div className="cart-container">
      <h1 className="cart-header">Your Cart ({cartItems.length})</h1>
      <div className="cart-layout">
        <div className="cart-items">
          {cartItems.length === 0 ? (
            <div className="cart-items-empty">Your cart is empty.</div>
          ) : (
            cartItems.map((ci) => (
              <CartItem key={ci.item._id} item={ci.item} onRemove={handleRemoveItem} />
            ))
          )}
        </div>
        <div className="cart-sidebar">
          <CartSummary items={cartItems} onCheckout={handleCheckout} />
        </div>
      </div>
    </div>
  );
};

export default CartPage;
