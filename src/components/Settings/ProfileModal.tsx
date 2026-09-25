import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';

const CURRENCIES = ['Rs.', '$', '€', '£'];

interface ProfileModalProps {
  onClose: () => void;
}

// Mounted only while open, so the fields start from the current profile each time.
export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { profile, saveProfile } = useTracker();
  const [name, setName] = useState(profile?.name ?? '');
  const [occupation, setOccupation] = useState(profile?.occupation ?? '');
  const [currency, setCurrency] = useState(profile?.currency ?? 'Rs.');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProfile({ name: name.trim() || 'You', occupation: occupation.trim(), currency });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Edit Profile</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="profile-role">Role</label>
            <input
              id="profile-role"
              type="text"
              className="form-input"
              placeholder="e.g. Founder, Developer, Student"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Currency</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }} role="radiogroup">
              {CURRENCIES.map((curr) => (
                <button
                  key={curr}
                  type="button"
                  role="radio"
                  aria-checked={currency === curr}
                  className="chip-btn"
                  style={{
                    padding: '8px 0',
                    justifyContent: 'center',
                    fontWeight: 700,
                    background: currency === curr ? '#ffffff' : 'rgba(255,255,255,0.03)',
                    color: currency === curr ? '#000000' : 'var(--text-secondary)',
                    borderColor: currency === curr ? '#ffffff' : 'var(--border-subtle)',
                  }}
                  onClick={() => setCurrency(curr)}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
            Goals and metrics are managed in Plan.
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Check size={15} />
              <span>Save</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
