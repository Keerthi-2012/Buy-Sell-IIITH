import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Navbar from './shared/Navbar';
import './Profile.css';
import axios from 'axios';
import { setUser } from '@/redux/authslice';

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
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put('${API_BASE}/user/update', formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      dispatch(setUser(res.data.user));
      setEditMode(false);
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
