import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Navbar from './shared/Navbar';
import './Profile.css';
import axios from 'axios';
import { setUser } from '@/redux/authslice';

const getAverageRating = (reviews) => {
  if (!reviews || reviews.length === 0) return 0;
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return (total / reviews.length).toFixed(1);
};

const Profile = () => {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    age: user?.age || '',
    contactNumber: user?.contactNumber || ''
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put('http://localhost:8000/api/v1/user/update', formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      dispatch(setUser(res.data.user)); // Update Redux state
      setEditMode(false); // Exit edit mode
    } catch (err) {
      console.error('Profile update failed:', err.response?.data || err.message);
    }
  };

  if (!user) {
    return (
      <div>
        <Navbar />
        <div className="profile-container">
          <h1 className="profile-title">Please log in to see your profile.</h1>
        </div>
      </div>
    );
  }

  const avgRating = getAverageRating(user.sellerReviews);
  const reviewsCount = user.sellerReviews?.length || 0;

  return (
    <div>
      <Navbar />
      <div className="profile-container">
        <h1 className="profile-title">Your Profile</h1>

        <div className="profile-card">
          <div className="avatar-container">
            <div className="avatar-circle">
              {user.firstName?.charAt(0)}
              {user.lastName?.charAt(0)}
            </div>
          </div>

          <div className="user-details">
            {editMode ? (
              <form onSubmit={handleSubmit} className="edit-form">
                <label>
                  First Name:
                  <input name="firstName" value={formData.firstName} onChange={handleChange} />
                </label>
                <label>
                  Last Name:
                  <input name="lastName" value={formData.lastName} onChange={handleChange} />
                </label>
                <label>
                  Age:
                  <input name="age" value={formData.age} onChange={handleChange} />
                </label>
                <label>
                  Contact Number:
                  <input name="contactNumber" value={formData.contactNumber} onChange={handleChange} />
                </label>
                <button type="submit">Save</button>
                <button type="button" onClick={() => setEditMode(false)}>Cancel</button>
              </form>
            ) : (
              <>
                <p><span className="font-semibold">Name:</span> {user.firstName} {user.lastName}</p>
                <p><span className="font-semibold">Email:</span> {user.email}</p>
                <p><span className="font-semibold">Age:</span> {user.age}</p>
                <p><span className="font-semibold">Contact Number:</span> {user.contactNumber}</p>
              </>
            )}

            <div className="reviews">
              <h2 className="section-title">Seller Reviews</h2>
              {reviewsCount > 0 ? (
                <p>Average Rating: <span className="font-bold">{avgRating} / 5</span> ({reviewsCount} reviews)</p>
              ) : (
                <p>No reviews yet.</p>
              )}
            </div>

            <div className="reviews">
              <h2 className="section-title">Activity Stats</h2>
              <div className="activity-grid">
                <div className="activity-card">
                  <p className="activity-number">{user.stats?.itemsBought || 0}</p>
                  <p className="activity-label">Items Bought</p>
                </div>
                <div className="activity-card">
                  <p className="activity-number">{user.stats?.itemsSold || 0}</p>
                  <p className="activity-label">Items Sold</p>
                </div>
                <div className="activity-card">
                  <p className="activity-number">{user.stats?.pendingOrders || 0}</p>
                  <p className="activity-label">Pending Orders</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!editMode && (
          <div className="edit-button">
            <button onClick={() => setEditMode(true)}>Edit Profile</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
