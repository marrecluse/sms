// frontend/src/pages/ProfilePage.jsx  (shared by all roles)
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Camera, Save, KeyRound, User, Mail, Phone, MapPin, BadgeCheck, X } from 'lucide-react';

const Field = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon className="w-4 h-4 text-gray-400" />
    </div>
    <div>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm text-gray-800 font-medium mt-0.5">{value || <span className="text-gray-300 italic">Not set</span>}</p>
    </div>
  </div>
);

const Input = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      {...props}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
    />
  </div>
);

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const fileRef               = useRef();

  const [profile, setProfile]       = useState(null);
  const [editMode, setEditMode]     = useState(false);
  const [pwMode, setPwMode]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [saving, setSaving]         = useState(false);

  const [form, setForm]   = useState({ name: '', phone: '', address: '' });
  const [pw, setPw]       = useState({ current: '', newPw: '', confirm: '' });

  const roleColor = { admin: 'bg-red-500', teacher: 'bg-emerald-500', student: 'bg-blue-500' }[user?.role] || 'bg-blue-500';
  const roleBadge = { admin: 'bg-red-100 text-red-700', teacher: 'bg-emerald-100 text-emerald-700', student: 'bg-blue-100 text-blue-700' }[user?.role] || '';

  useEffect(() => {
    if (!user?.id) return;
    usersAPI.get(user.id)
      .then(r => {
        setProfile(r.data);
        setForm({ name: r.data.name || '', phone: r.data.phone || '', address: r.data.address || '' });
      })
      .catch(() => toast.error('Failed to load profile'));
  }, [user?.id]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Max 2MB'); return; }
    setUploading(true);
    try {
      const r = await usersAPI.uploadAvatar(user.id, file);
      const url = r.data.url;
      setProfile(p => ({ ...p, profile_picture: url }));
      refreshUser({ profile_picture: url });
      toast.success('Profile picture updated!');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      await usersAPI.update(user.id, form);
      setProfile(p => ({ ...p, ...form }));
      refreshUser({ name: form.name });
      setEditMode(false);
      toast.success('Profile updated!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pw.newPw.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (pw.newPw !== pw.confirm) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      await usersAPI.update(user.id, { password: pw.newPw });
      setPwMode(false);
      setPw({ current: '', newPw: '', confirm: '' });
      toast.success('Password changed!');
    } catch { toast.error('Failed to change password'); }
    finally { setSaving(false); }
  };

  if (!profile) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Banner */}
        <div className={`h-24 ${roleColor} opacity-80`} />

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="flex items-end gap-4 -mt-12 mb-4">
            <div className="relative">
              {profile.profile_picture ? (
                <img
                  src={profile.profile_picture}
                  alt={profile.name}
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div className={`w-24 h-24 ${roleColor} rounded-2xl border-4 border-white shadow-md flex items-center justify-center text-white text-3xl font-bold`}>
                  {profile.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-md transition-colors disabled:opacity-50"
                title="Change photo"
              >
                {uploading
                  ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera className="w-3.5 h-3.5" />
                }
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            <div className="pb-1">
              <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${roleBadge}`}>
                  {profile.role}
                </span>
                {profile.is_active
                  ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                  : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>
                }
              </div>
            </div>
          </div>

          {/* Info fields */}
          <Field icon={Mail}      label="Email"   value={profile.email} />
          <Field icon={Phone}     label="Phone"   value={profile.phone} />
          <Field icon={MapPin}    label="Address" value={profile.address} />
          {profile.student_info?.roll_number && (
            <Field icon={BadgeCheck} label="Roll Number" value={profile.student_info.roll_number} />
          )}
          {profile.student_info?.program && (
            <Field icon={User} label="Program" value={`${profile.student_info.program} — ${profile.student_info.department}`} />
          )}
          {profile.teacher_info?.employee_id && (
            <Field icon={BadgeCheck} label="Employee ID" value={profile.teacher_info.employee_id} />
          )}
          {profile.teacher_info?.department && (
            <Field icon={User} label="Department" value={profile.teacher_info.department} />
          )}

          {/* Action buttons */}
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => { setEditMode(true); setPwMode(false); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <User className="w-4 h-4" /> Edit Profile
            </button>
            <button
              onClick={() => { setPwMode(true); setEditMode(false); }}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <KeyRound className="w-4 h-4" /> Change Password
            </button>
          </div>
        </div>
      </div>

      {/* Edit profile form */}
      {editMode && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-800">Edit Profile</h2>
            <button onClick={() => setEditMode(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <Input label="Full Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            <Input label="Phone" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+92 300 0000000" />
            <Input label="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="City, Country" />
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => setEditMode(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Change password form */}
      {pwMode && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-800">Change Password</h2>
            <button onClick={() => setPwMode(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input label="New Password" type="password" value={pw.newPw}
              onChange={e => setPw(p => ({ ...p, newPw: e.target.value }))}
              placeholder="Min 6 characters" required minLength={6} />
            <Input label="Confirm New Password" type="password" value={pw.confirm}
              onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))}
              placeholder="Repeat new password" required />
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                <KeyRound className="w-4 h-4" />{saving ? 'Saving…' : 'Update Password'}
              </button>
              <button type="button" onClick={() => setPwMode(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
