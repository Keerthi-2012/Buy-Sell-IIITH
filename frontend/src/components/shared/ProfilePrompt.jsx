import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';

// Banner asking users (mostly new CAS logins) to add the age and phone number needed to buy or sell.
const ProfilePrompt = () => {
  const user = useSelector((state) => state.auth.user);
  const { pathname } = useLocation();

  // `=== false` so cached users from before this flag existed don't flash the banner.
  if (!user || user.profileComplete !== false) return null;
  if (pathname.toLowerCase() === '/profile') return null;

  return (
    <div
      role="alert"
      style={{ background: '#fef3c7', color: '#92400e', padding: '0.6rem 1rem', textAlign: 'center' }}
    >
      Add your age and contact number to start buying and selling.{' '}
      <Link to="/profile" style={{ textDecoration: 'underline', fontWeight: 600 }}>
        Complete your profile
      </Link>
    </div>
  );
};

export default ProfilePrompt;
