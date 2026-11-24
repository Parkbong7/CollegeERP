import React from 'react';

export default function Navbar({ currentUser }) {
  return (
    <header className="shell-navbar">
      <div className="navbar-brand">
        <span className="brand-logo">🎓</span>
        <span className="brand-title">College ERP</span>
        <span className="brand-badge">Enterprise Edition</span>
      </div>
      <div className="navbar-actions">
        <span className="user-info">{currentUser ? currentUser.name : 'Administrator'}</span>
        <div className="avatar">A</div>
      </div>
    </header>
  );
}
