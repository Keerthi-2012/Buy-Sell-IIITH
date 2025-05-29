import React from 'react';
import Navbar from './shared/Navbar';
import { useSelector } from 'react-redux';
import './Profile.css';  // <-- import the css here

const getAverageRating = (reviews) => {
  if (!reviews || reviews.length === 0) return 0;
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return (total / reviews.length).toFixed(1);
};

const Profile = () => {
  const user = useSelector((state) => state.auth.user);
  console.log("Redux User:", user);

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
          {/* Avatar Section */}
          <div className="avatar-container">
            <div className="avatar-circle">
              {user.firstName?.charAt(0)}
              {user.lastName?.charAt(0)}
            </div>
          </div>

          {/* User Details */}
          <div className="user-details">
            <div>
              <p><span className="font-semibold">Name:</span> {user.firstName} {user.lastName}</p>
              <p><span className="font-semibold">Email:</span> {user.email}</p>
              <p><span className="font-semibold">Age:</span> {user.age}</p>
              <p><span className="font-semibold">Contact Number:</span> {user.contactNumber}</p>

            </div>

            <div className="reviews">
              <h2 className="section-title">Seller Reviews</h2>
              {reviewsCount > 0 ? (
                <p>
                  Average Rating: <span className="font-bold">{avgRating} / 5</span> ({reviewsCount} reviews)
                </p>
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

        <div className="edit-button">
          <button>Edit Profile</button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
