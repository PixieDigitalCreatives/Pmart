import React, { forwardRef, useState } from 'react';
import { TbEye, TbEyeOff } from 'react-icons/tb';

export const PasswordInput = forwardRef(
  ({ className = '', error, icon: Icon, showToggle = true, disabled = false, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="input-wrapper">
        {Icon && <Icon className="input-icon" aria-hidden="true" />}
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          disabled={disabled}
          className={`form-control ${Icon ? 'has-icon' : ''} ${showToggle ? 'has-password-toggle' : ''} ${
            error ? 'is-invalid' : ''
          } ${className}`.trim()}
          {...props}
        />
        {showToggle && (
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => setVisible((v) => !v)}
            disabled={disabled}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            tabIndex={0}
          >
            {visible ? <TbEyeOff aria-hidden="true" /> : <TbEye aria-hidden="true" />}
          </button>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

