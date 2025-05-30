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
  console.log("Redux user:", user); // <--- ADD THIS
  console.log("Token:", token);
    if (!user || !user._id) {
      console.log("User not logged in yet");
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
        console.log("Token:",token);
        if (!res.ok) {
          throw new Error("Failed to fetch cart");
        }

        const data = await res.json();
        console.log("Cart data from backend:", data);

        setCartItems(data.items || []);
      } catch (err) {
        console.error("Error fetching cart:", err);
        setCartItems([]);
      }
    };

    fetchCart();
  }, [user, location.search, token]);

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
                <CartItem key={index} item={ci.item} quantity={ci.quantity} />
              ))
            )}
          </div>
          <div className="cart-sidebar">
            <CartSummary items={cartItems} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
