import React, { useState } from 'react';
import { FileText, Pin, Paperclip, Tag, User, Plus, X, Search, Filter } from 'lucide-react';

interface AdminNotesProps {
  sellerId: string;
}

type NotePriority = 'low' | 'medium' | 'high';
type NoteCategory = 'general' | 'warning' | 'issue' | 'positive' | 'other';

interface AdminNote {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  priority: NotePriority;
  category: NoteCategory;
  isPinned: boolean;
  taggedAdmins: string[];
  attachments: string[];
}

const mockNotes: AdminNote[] = [
  {
    id: 'NOTE-001',
    content: 'Seller has been responsive to customer inquiries. Good communication.',
    createdBy: 'Admin User',
    createdAt: '2024-03-10',
    priority: 'low',
    category: 'positive',
    isPinned: false,
    taggedAdmins: [],
    attachments: [],
  },
  {
    id: 'NOTE-002',
    content: 'Multiple complaints about shipping delays. Monitor closely for next 30 days.',
    createdBy: 'Admin Manager',
    createdAt: '2024-03-05',
    updatedAt: '2024-03-08',
    priority: 'high',
    category: 'warning',
    isPinned: true,
    taggedAdmins: ['Admin User', 'Support Team'],
    attachments: ['complaints-report.pdf'],
  },
  {
    id: 'NOTE-003',
    content: 'KYC verification completed successfully. All documents approved.',
    createdBy: 'Admin User',
    createdAt: '2024-01-16',
    priority: 'medium',
    category: 'general',
    isPinned: false,
    taggedAdmins: [],
    attachments: [],
  },
  {
    id: 'NOTE-004',
    content: 'Payment issue reported. Investigating with finance team.',
    createdBy: 'Finance Admin',
    createdAt: '2024-03-12',
    priority: 'high',
    category: 'issue',
    isPinned: false,
    taggedAdmins: ['Admin User'],
    attachments: ['payment-log.pdf'],
  },
];

const mockAdmins = ['Admin User', 'Admin Manager', 'Support Team', 'Finance Admin', 'Operations Admin'];

export default function AdminNotes({ sellerId }: AdminNotesProps) {
  const [notes, setNotes] = useState<AdminNote[]>(mockNotes);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<NoteCategory | 'all'>('all');
  const [newNote, setNewNote] = useState({
    content: '',
    priority: 'medium' as NotePriority,
    category: 'general' as NoteCategory,
    taggedAdmins: [] as string[],
    attachments: [] as string[],
  });

  const filteredNotes = notes.filter((note) => {
    const matchesSearch = note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || note.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const pinnedNotes = filteredNotes.filter((n) => n.isPinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.isPinned);

  const togglePin = (noteId: string) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === noteId ? { ...note, isPinned: !note.isPinned } : note)),
    );
  };

  const toggleTagAdmin = (adminName: string) => {
    if (newNote.taggedAdmins.includes(adminName)) {
      setNewNote({
        ...newNote,
        taggedAdmins: newNote.taggedAdmins.filter((a) => a !== adminName),
      });
    } else {
      setNewNote({
        ...newNote,
        taggedAdmins: [...newNote.taggedAdmins, adminName],
      });
    }
  };

  const handleAddNote = () => {
    const note: AdminNote = {
      id: `NOTE-${Date.now()}`,
      content: newNote.content,
      createdBy: 'Current Admin',
      createdAt: new Date().toISOString().split('T')[0],
      priority: newNote.priority,
      category: newNote.category,
      isPinned: false,
      taggedAdmins: newNote.taggedAdmins,
      attachments: newNote.attachments,
    };
    setNotes([note, ...notes]);
    setNewNote({
      content: '',
      priority: 'medium',
      category: 'general',
      taggedAdmins: [],
      attachments: [],
    });
    setShowAddNoteModal(false);
  };

  const getPriorityBadge = (priority: NotePriority) => {
    const styles = {
      low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[priority]}`}>{priority}</span>
    );
  };

  const getCategoryBadge = (category: NoteCategory) => {
    const styles = {
      general: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
      warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      issue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      positive: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[category]}`}>{category}</span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Admin Notes</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Internal notes and observations</p>
        </div>
        <button
          onClick={() => setShowAddNoteModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40"
        >
          <Plus className="h-4 w-4" /> Add Note
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-96">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as NoteCategory | 'all')}
          className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Categories</option>
          <option value="general">General</option>
          <option value="warning">Warning</option>
          <option value="issue">Issue</option>
          <option value="positive">Positive</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Pinned Notes */}
      {pinnedNotes.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Pinned Notes</h3>
          <div className="space-y-3">
            {pinnedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onTogglePin={() => togglePin(note.id)}
                getPriorityBadge={getPriorityBadge}
                getCategoryBadge={getCategoryBadge}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Notes */}
      <div>
        {pinnedNotes.length > 0 && (
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">All Notes</h3>
        )}
        <div className="space-y-3">
          {unpinnedNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onTogglePin={() => togglePin(note.id)}
              getPriorityBadge={getPriorityBadge}
              getCategoryBadge={getCategoryBadge}
            />
          ))}
        </div>
      </div>

      {filteredNotes.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">No notes found matching your filters.</p>
        </div>
      )}

      {/* Add Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowAddNoteModal(false);
                setNewNote({
                  content: '',
                  priority: 'medium',
                  category: 'general',
                  taggedAdmins: [],
                  attachments: [],
                });
              }}
              className="absolute right-4 top-4 rounded-full border border-gray-200 p-1 text-gray-500 hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Add Admin Note</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Note</label>
                <textarea
                  rows={6}
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Enter your note here..."
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Priority
                  </label>
                  <select
                    value={newNote.priority}
                    onChange={(e) => setNewNote({ ...newNote, priority: e.target.value as NotePriority })}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Category
                  </label>
                  <select
                    value={newNote.category}
                    onChange={(e) => setNewNote({ ...newNote, category: e.target.value as NoteCategory })}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="general">General</option>
                    <option value="warning">Warning</option>
                    <option value="issue">Issue</option>
                    <option value="positive">Positive</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Tag Admins
                </label>
                <div className="flex flex-wrap gap-2">
                  {mockAdmins.map((admin) => (
                    <button
                      key={admin}
                      onClick={() => toggleTagAdmin(admin)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        newNote.taggedAdmins.includes(admin)
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white'
                          : 'border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      <Tag className="mr-1 inline h-3 w-3" />
                      {admin}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Attachments
                </label>
                <button className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 hover:border-emerald-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  <Paperclip className="mx-auto mb-2 h-6 w-6" />
                  Click to upload files
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddNoteModal(false);
                    setNewNote({
                      content: '',
                      priority: 'medium',
                      category: 'general',
                      taggedAdmins: [],
                      attachments: [],
                    });
                  }}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.content.trim()}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40 disabled:opacity-50"
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  onTogglePin,
  getPriorityBadge,
  getCategoryBadge,
}: {
  note: AdminNote;
  onTogglePin: () => void;
  getPriorityBadge: (priority: NotePriority) => JSX.Element;
  getCategoryBadge: (category: NoteCategory) => JSX.Element;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            {getPriorityBadge(note.priority)}
            {getCategoryBadge(note.category)}
            {note.isPinned && (
              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <Pin className="h-3 w-3" /> Pinned
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{note.content}</p>
        </div>
        <button
          onClick={onTogglePin}
          className={`ml-4 rounded-full border p-1.5 ${
            note.isPinned
              ? 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
              : 'border-gray-200 text-gray-400 hover:border-amber-400 dark:border-gray-700 dark:hover:border-amber-400'
          }`}
          title={note.isPinned ? 'Unpin note' : 'Pin note'}
        >
          <Pin className={`h-4 w-4 ${note.isPinned ? 'fill-current' : ''}`} />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          <span>{note.createdBy}</span>
        </div>
        <span>•</span>
        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
        {note.updatedAt && (
          <>
            <span>•</span>
            <span>Updated: {new Date(note.updatedAt).toLocaleDateString()}</span>
          </>
        )}
        {note.taggedAdmins.length > 0 && (
          <>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              <span>{note.taggedAdmins.join(', ')}</span>
            </div>
          </>
        )}
        {note.attachments.length > 0 && (
          <>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              <span>{note.attachments.length} file(s)</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
