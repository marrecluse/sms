// frontend/src/pages/admin/AdminUsers.jsx
import { useState, useEffect } from 'react';
import { usersAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, UserCheck, UserX, Edit2, Trash2, KeyRound, Eye, X, Camera } from 'lucide-react';

const ROLES = ['all','admin','teacher','student','librarian'];
const ROLE_COLORS = {
  admin:     'bg-red-100 text-red-700',
  teacher:   'bg-emerald-100 text-emerald-700',
  student:   'bg-blue-100 text-blue-700',
  librarian: 'bg-purple-100 text-purple-700',
};
const AVATAR_BG = {
  admin:     'bg-red-500',
  teacher:   'bg-emerald-500',
  student:   'bg-blue-500',
  librarian: 'bg-purple-500',
};

const Input = ({ label, ...props }) => (
  <div>
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" {...props} />
  </div>
);

// ── Modal defined OUTSIDE the component so it never re-mounts on each render ──
const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

// ── Avatar component ──
const UserAvatar = ({ user, size = 'sm', onClick }) => {
  const s = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-16 h-16 text-2xl';
  const bg = AVATAR_BG[user.role] || 'bg-gray-500';
  return user.profile_picture ? (
    <img src={user.profile_picture} alt={user.name}
      onClick={onClick}
      className={`${s} rounded-full object-cover border border-gray-200 flex-shrink-0 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`} />
  ) : (
    <div className={`${s} ${bg} rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold`}>
      {user.name?.charAt(0)?.toUpperCase()}
    </div>
  );
};

export default function AdminUsers() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');
  const [saving, setSaving]     = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal]     = useState(null);
  const [profileModal, setProfileModal] = useState(null);
  const [pwModal, setPwModal]         = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const [createForm, setCreateForm] = useState({
    name:'', email:'', password:'', role:'student',
    phone:'', roll_number:'', employee_id:'',
    batch_year: new Date().getFullYear(), program_id: 1, department_id: 1
  });
  const [editForm, setEditForm]   = useState({ name:'', phone:'', address:'' });
  const [newPassword, setNewPassword] = useState('');

  const load = () => {
    setLoading(true);
    usersAPI.list(filter === 'all' ? null : filter)
      .then(r => setUsers(r.data))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await usersAPI.create(createForm);
      toast.success('User created');
      setCreateModal(false);
      setCreateForm({ name:'', email:'', password:'', role:'student', phone:'', roll_number:'', employee_id:'', batch_year: new Date().getFullYear(), program_id:1, department_id:1 });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    } finally { setSaving(false); }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const openEdit = (u) => {
    setEditForm({ name: u.name, phone: u.phone || '', address: u.address || '' });
    setEditModal(u);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await usersAPI.update(editModal.id, editForm);
      toast.success('User updated');
      setEditModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update user');
    } finally { setSaving(false); }
  };

  // ── Reset Password ────────────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSaving(true);
    try {
      await usersAPI.update(pwModal.id, { password: newPassword });
      toast.success('Password reset successfully');
      setPwModal(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password');
    } finally { setSaving(false); }
  };

  // ── Toggle Active ─────────────────────────────────────────────────────────
  const toggleActive = async (u) => {
    try {
      await usersAPI.update(u.id, { is_active: u.is_active ? 0 : 1 });
      toast.success(u.is_active ? 'User deactivated' : 'User activated');
      load();
    } catch { toast.error('Failed to update user'); }
  };

  // ── Upload Avatar ─────────────────────────────────────────────────────────
  const handleAvatarUpload = async (u, file) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) { toast.error('Please select a JPG, PNG, GIF, or WEBP image'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    try {
      await usersAPI.uploadAvatar(u.id, file);
      toast.success(`Profile photo updated for ${u.name}`);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Upload failed'); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await usersAPI.remove(deleteModal.id);
      toast.success('User deleted');
      setDeleteModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage all users in the system</p>
        </div>
        <button onClick={() => setCreateModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {ROLES.map(r => (
            <button key={r} onClick={() => setFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${filter === r ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Name','Email','Role','Phone','Status','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">No users found</td></tr>
                ) : filtered.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar user={u} size="sm"
                          onClick={u.profile_picture ? () => setLightboxUrl(u.profile_picture) : undefined} />
                        <span className="font-medium text-gray-800">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[u.role] || ''}`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setProfileModal(u)} title="View Profile"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => openEdit(u)} title="Edit User"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => { setPwModal(u); setNewPassword(''); }} title="Reset Password"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><KeyRound className="w-4 h-4" /></button>
                        <label title="Upload Photo" className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer">
                          <Camera className="w-4 h-4" />
                          <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden"
                            onChange={e => { if (e.target.files[0]) handleAvatarUpload(u, e.target.files[0]); e.target.value = ''; }} />
                        </label>
                        <button onClick={() => toggleActive(u)} title={u.is_active ? 'Deactivate' : 'Activate'}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                          {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setDeleteModal(u)} title="Delete User"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Image Lightbox ─────────────────────────────────────────────────── */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <img src={lightboxUrl} alt="Profile" className="w-full rounded-2xl shadow-2xl object-contain max-h-[80vh]" />
            <button onClick={() => setLightboxUrl(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Create Modal ───────────────────────────────────────────────────── */}
      {createModal && (
        <Modal title="Add New User" onClose={() => setCreateModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Input label="Full Name *" required value={createForm.name} onChange={e => setCreateForm(f=>({...f,name:e.target.value}))} /></div>
              <div className="col-span-2"><Input label="Email *" required type="email" value={createForm.email} onChange={e => setCreateForm(f=>({...f,email:e.target.value}))} /></div>
              <Input label="Password *" required type="password" value={createForm.password} onChange={e => setCreateForm(f=>({...f,password:e.target.value}))} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select value={createForm.role} onChange={e => setCreateForm(f=>({...f,role:e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                  <option value="librarian">Librarian</option>
                </select>
              </div>
              <Input label="Phone" value={createForm.phone} onChange={e => setCreateForm(f=>({...f,phone:e.target.value}))} />
              {createForm.role === 'student' && <Input label="Roll Number" value={createForm.roll_number} onChange={e => setCreateForm(f=>({...f,roll_number:e.target.value}))} />}
              {createForm.role === 'teacher' && <Input label="Employee ID" value={createForm.employee_id} onChange={e => setCreateForm(f=>({...f,employee_id:e.target.value}))} />}
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setCreateModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {saving ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── View Profile Modal ─────────────────────────────────────────────── */}
      {profileModal && (
        <Modal title="User Profile" onClose={() => setProfileModal(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <UserAvatar user={profileModal} size="lg"
                onClick={profileModal.profile_picture ? () => setLightboxUrl(profileModal.profile_picture) : undefined} />
              <div>
                <p className="text-lg font-semibold text-gray-800">{profileModal.name}</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[profileModal.role] || ''}`}>{profileModal.role}</span>
              </div>
            </div>
            <hr />
            {[
              ['Email',   profileModal.email],
              ['Phone',   profileModal.phone || '—'],
              ['Address', profileModal.address || '—'],
              ['Status',  profileModal.is_active ? 'Active' : 'Inactive'],
              ['Joined',  new Date(profileModal.created_at).toLocaleDateString('en-PK', { year:'numeric', month:'long', day:'numeric' })],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm py-1 border-b border-gray-50">
                <span className="font-medium text-gray-500">{label}</span>
                <span className="text-gray-800">{value}</span>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setProfileModal(null); openEdit(profileModal); }}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              <button onClick={() => setProfileModal(null)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium">Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      {editModal && (
        <Modal title={`Edit — ${editModal.name}`} onClose={() => setEditModal(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <Input label="Full Name *" required value={editForm.name} onChange={e => setEditForm(f=>({...f,name:e.target.value}))} />
            <Input label="Phone" value={editForm.phone} onChange={e => setEditForm(f=>({...f,phone:e.target.value}))} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea rows={3} value={editForm.address} onChange={e => setEditForm(f=>({...f,address:e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditModal(null)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Reset Password Modal ───────────────────────────────────────────── */}
      {pwModal && (
        <Modal title={`Reset Password — ${pwModal.name}`} onClose={() => setPwModal(null)}>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-sm text-gray-500">Set a new password for this user. They will need to use it on their next login.</p>
            <Input label="New Password *" required type="password" placeholder="Min. 6 characters"
              value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setPwModal(null)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {saving ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Confirmation Modal ──────────────────────────────────────── */}
      {deleteModal && (
        <Modal title="Delete User" onClose={() => setDeleteModal(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
              <Trash2 className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">
                Are you sure you want to delete <strong>{deleteModal.name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              <p><span className="font-medium">Email:</span> {deleteModal.email}</p>
              <p><span className="font-medium">Role:</span> <span className="capitalize">{deleteModal.role}</span></p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteModal(null)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium">
                Yes, Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
