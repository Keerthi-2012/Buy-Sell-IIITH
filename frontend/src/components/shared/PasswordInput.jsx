import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './PasswordInput.css';

// A password box with a show/hide eye on its right; takes the same props as a normal <input>.
const PasswordInput = ({ id, ...inputProps }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input id={id} {...inputProps} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

export default PasswordInput;
