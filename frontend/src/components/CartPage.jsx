import { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { CartItem } from "./CartItem";
import { CartSummary } from "./CartSummary";
import { api, errorMessage } from "../utils/api";
import { reportError } from "../utils/reportError";
import "./CartPage.css";

const CartPage = () => {
  const [cartItems, setCartItems] = useState([]);
  const navigate = useNavigate();

  // Load the cart once when the page opens.
  useEffect(() => {
    api
      .get("/cart")
      .then((res) => setCartItems(res.data.items || []))
      .catch((err) => {
        toast.error(errorMessage(err, "Failed to fetch cart"));
        setCartItems([]);
      });
  }, []);

  // Changes how many of an item are in the cart; the server clamps it to the stock.
  const handleQuantityChange = async (itemId, quantity) => {
    try {
      const res = await api.patch("/cart/item", { itemId, quantity });
      setCartItems(res.data.items || []);
    } catch (err) {
      toast.error(errorMessage(err, "Could not change the quantity"));
    }
  };

  // Removes one item and shows the cart the server sends back.
  const handleRemoveItem = async (itemId) => {
    try {
      const res = await api.post("/cart/remove", { itemId });
      setCartItems(res.data.cart.items || []);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to remove item"));
    }
  };

  // Orders everything in the cart, then jumps to Orders where the OTPs are.
  const handleCheckout = async () => {
    try {
      await api.post("/order/checkout", {});
      toast.success("Order placed! Your delivery OTPs are on the Orders page.");
      setCartItems([]);
      navigate("/orders");
    } catch (err) {
      reportError(err, navigate, "Checkout failed");
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
              <CartItem
                key={ci.item._id}
                item={ci.item}
                quantity={ci.quantity}
                onQuantityChange={handleQuantityChange}
                onRemove={handleRemoveItem}
              />
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
