import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "./shared/Navbar";
import { CartItem } from "./CartItem";
import { CartSummary } from "./CartSummary";
import "./CartPage.css";

const CartPage = () => {
  const user = useSelector((state) => state.auth.user);
  const token = localStorage.getItem("token");
  const [cartItems, setCartItems] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user || !user._id) {
      setCartItems([]);
      return;
    }

    const fetchCart = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/v1/order/cart", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch cart");
        }

        const data = await res.json();
        setCartItems(data.items || []);
      } catch (err) {
        console.error("Error fetching cart:", err);
        setCartItems([]);
      }
    };

    fetchCart();
  }, [user, location.search, token]);

  // Add this handler in CartPage:
  const handleRemoveItem = async (itemId) => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/order/cart/remove", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemId }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to remove item");
      }

      const data = await res.json();
      setCartItems(data.cart.items || []);
    } catch (err) {
      console.error("Error removing item:", err);
    }
  };
  const handleCheckout = async () => {
  try {
    const res = await fetch("http://localhost:8000/api/v1/order/checkoutallItems", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Checkout failed");
    }

    alert("Checkout successful!");
    setCartItems([]); // Clear frontend cart state
    navigate("/orders"); // Navigate to orders page
  } catch (err) {
    console.error("Checkout error:", err);
    alert("Checkout failed: " + err.message);
  }
};

  return (
    <div>
      <Navbar />
      <div className="cart-container">
        <h1 className="cart-header">Your Cart ({cartItems.length})</h1>
        <div className="cart-layout">
          <div className="cart-items">
            {cartItems.length === 0 ? (
              <div className="cart-items-empty">Your cart is empty.</div>
            ) : (
              cartItems.map((ci, index) => (
                <CartItem
                  key={index}
                  item={ci.item}
                  quantity={ci.quantity}
                  onRemove={handleRemoveItem} // Pass the callback here
                />
              ))
            )}
          </div>
          <div className="cart-sidebar">
            <CartSummary items={cartItems} onCheckout={handleCheckout} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
