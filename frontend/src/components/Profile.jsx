import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './Profile.css';
import toast from 'react-hot-toast';
import { api, errorMessage } from '../utils/api';
import { setUser } from '@/redux/authslice';

const Profile = () => {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  // Incomplete profiles (e.g. a first CAS login) go straight into edit mode.
  const [editMode, setEditMode] = useState(!user.profileComplete);
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    age: user.age || '',
    contactNumber: user.contactNumber || ''
  });

  // Keeps the edit form in sync with what the user types.
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Saves the profile and refreshes the user shown across the app.
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/user/update', { ...formData, age: Number(formData.age) });
      dispatch(setUser(res.data.user));
      setEditMode(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(errorMessage(err, 'Profile update failed'));
    }
  };

  return (
    <div>
      <div className="profile-container">
        <h1 className="profile-title">Your Profile</h1>
        {!user.profileComplete && (
          <p>Add your age and contact number so buyers and sellers can reach you.</p>
        )}

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
                  <input name="age" type="number" min="1" max="120" value={formData.age} onChange={handleChange} />
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
