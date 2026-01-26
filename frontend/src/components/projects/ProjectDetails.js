import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  MoreHorizontal,
  Calendar,
  CheckCircle2,
  ChevronDown,
  X,
  AlignLeft,
  Paperclip,
  Send,
  ClipboardCheck,
  Check,
  ChevronRight,
  Layout,
  ListTodo,
  Kanban,
  Users,
  Contact,
  Receipt,
  CalendarRange,
  FileUp,
  File,
  Trash2,
  Download,
  Map,
  LayoutGrid,
  Building2,
  Layers,
  Zap,
  Droplet,
  Wind,
  Flame,
  Trees,
  Armchair,
  FileText,
  FileCheck,
  Presentation
} from 'lucide-react';
import AuditLogList from '../common/AuditLogList';
import TeamRoster from './TeamRoster';
import ClientContacts from './ClientContacts';
import ResourcePlanner from './ResourcePlanner';
import ResourceAllocator from './ResourceAllocator';
import FinancialScorecard from './FinancialScorecard';
import ProjectFinancialsTab from './ProjectFinancialsTab';
import ProjectInvoicesTab from './ProjectInvoicesTab';
import LoadingSpinner from '../common/LoadingSpinner';
import ProjectDetailsSkeleton from './ProjectDetailsSkeleton';

import TaskDetailPanel from './TaskDetailPanel';
import { AsanaSection, AsanaTaskRow, formatStatus, formatPriority, PriorityIcon } from './AsanaListComponents';
import { PROJECT_STAGES, PROJECT_STATUSES, PROJECT_PRIORITIES, PROJECT_CHARGE_TYPES, DRAWING_TYPES } from '../../constants/projectEnums';
import './ProjectDetails.css';

const PAGE_SIZE = 12;



// --- Task Modal Component ---
const TaskModal = ({ task, onClose, onSave }) => {
  const [desc, setDesc] = useState(task.description || '');

  return (
    <div className="task-modal-overlay">
      <div className="task-modal">
        <div className="task-modal-header">
          <div className="task-modal-actions-left">
            <button className="btn-complete">
              <CheckCircle2 size={16} />
              Mark Complete
            </button>
          </div>
          <div className="task-modal-actions-right">
            <button className="btn-icon-modal" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div className="task-modal-body">
          <div className="task-modal-main">
            <h1 className="task-modal-title">{task.name}</h1>

            <div className="task-modal-fields">
              <div className="task-field-row">
                <div className="task-field-label">Assignee</div>
                <div className="task-field-value">
                  {task.assignee ? (
                    <div className="assignee-display">
                      <div className="assignee-avatar-modal">
                        {task.assignee.name ? task.assignee.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span>{task.assignee.name || task.assignee.username}</span>
                    </div>
                  ) : (
                    <span className="task-field-empty">Unassigned</span>
                  )}
                </div>
              </div>
              <div className="task-field-row">
                <div className="task-field-label">Due date</div>
                <div className="task-field-value">
                  <Calendar size={16} className="field-icon" />
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No due date'}
                </div>
              </div>
              <div className="task-field-row">
                <div className="task-field-label">Priority</div>
                <div className="task-field-value">
                  <PriorityIcon priority={task.priority} />
                  <span>{task.priority || 'None'}</span>
                </div>
              </div>
              <div className="task-field-row">
                <div className="task-field-label">Status</div>
                <div className="task-field-value">
                  <span className="status-badge-modal">{task.status?.replace(/_/g, ' ') || 'To Do'}</span>
                </div>
              </div>
            </div>

            <div className="task-description-section">
              <div className="task-description-header">
                <AlignLeft size={18} />
                <span>Description</span>
              </div>
              <textarea
                className="task-description-input"
                placeholder="What is this task about?"
                value={desc}
                onChange={(e) => {
                  setDesc(e.target.value);
                  onSave(task.id, { description: e.target.value });
                }}
              />
            </div>
          </div>

          <div className="task-modal-sidebar">
            <h3 className="sidebar-title">Meta Data</h3>
            <div className="sidebar-content">
              <div className="sidebar-row">
                <span>Created on</span>
                <span>{task.createdAt ? new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}</span>
              </div>
              <div className="sidebar-row">
                <span>Created by</span>
                <span>{task.reporter?.name || 'System'}</span>
              </div>
              <div className="sidebar-divider"></div>
              <div className="sidebar-id">
                Task ID: #{task.id.toString().substring(0, 6)}
              </div>
            </div>
          </div>
        </div>

        <div className="task-modal-footer">
          <div className="comment-avatar">ME</div>
          <div className="comment-input-wrapper">
            <input
              type="text"
              placeholder="Ask a question or post an update..."
              className="comment-input"
            />
            <button className="comment-send-btn">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get icon based on drawing type
const getDrawingTypeIcon = (drawingType) => {
  const iconProps = { size: 16 };
  switch (drawingType) {
    case 'SITE_PLAN': return <Map {...iconProps} />;
    case 'FLOOR_PLAN': return <LayoutGrid {...iconProps} />;
    case 'ELEVATION': return <Building2 {...iconProps} />;
    case 'SECTION': return <Layers {...iconProps} />;
    case 'STRUCTURAL': return <LayoutGrid {...iconProps} />;
    case 'ELECTRICAL': return <Zap {...iconProps} />;
    case 'PLUMBING': return <Droplet {...iconProps} />;
    case 'HVAC': return <Wind {...iconProps} />;
    case 'FIRE_FIGHTING': return <Flame {...iconProps} />;
    case 'LANDSCAPE': return <Trees {...iconProps} />;
    case 'INTERIOR': return <Armchair {...iconProps} />;
    case 'WORKING': return <FileText {...iconProps} />;
    case 'SUBMISSION': return <FileCheck {...iconProps} />;
    case 'PRESENTATION': return <Presentation {...iconProps} />;
    default: return <File {...iconProps} />;
  }
};

const DocumentUploadModal = ({ files, onClose, onUpload, projectStage }) => {
  const [selectedStage, setSelectedStage] = useState(projectStage || '');
  const [selectedType, setSelectedType] = useState('WORKING'); // Default to Working Drawing
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // If we have multiple files, we apply the same metadata to all of them for now
  // Enhancment: Allow per-file metadata if needed

  const handleUpload = async () => {
    setIsUploading(true);
    setUploadProgress(0);

    // Convert files object to array if needed
    const fileList = Array.from(files);
    const total = fileList.length;
    let completed = 0;

    for (const file of fileList) {
      await onUpload(file, selectedStage, selectedType);
      completed++;
      setUploadProgress(Math.round((completed / total) * 100));
    }

    setIsUploading(false);
    onClose();
  };

  return (
    <div className="task-modal-overlay">
      <div className="task-modal" style={{ maxWidth: '500px', height: 'auto', maxHeight: '90vh' }}>
        <div className="task-modal-header">
          <h3>Upload Drawings</h3>
          <button className="btn-icon-modal" onClick={onClose} disabled={isUploading}><X size={20} /></button>
        </div>

        <div className="task-modal-body" style={{ padding: '20px' }}>
          <div className="overview-details-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>

            <div className="info-box" style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <FileUp size={16} className="text-primary" />
                <span style={{ fontWeight: 600 }}>{files.length} file(s) selected</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                {Array.from(files).map(f => f.name).join(', ')}
              </div>
            </div>

            <div className="form-group">
              <label className="task-field-label" style={{ display: 'block', marginBottom: '8px' }}>Project Stage</label>
              <select
                className="form-control"
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                style={{ width: '100%', padding: '8px' }}
                disabled={isUploading}
              >
                <option value="">Select Stage</option>
                {PROJECT_STAGES.map(stage => (
                  <option key={stage.value} value={stage.value}>{stage.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="task-field-label" style={{ display: 'block', marginBottom: '8px' }}>Drawing Type</label>
              <select
                className="form-control"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{ width: '100%', padding: '8px' }}
                disabled={isUploading}
              >
                <option value="">Select Drawing Type</option>
                {DRAWING_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {isUploading && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem' }}>
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#3b82f6', transition: 'width 0.3s ease' }}></div>
                </div>
              </div>
            )}

          </div>
        </div>

        <div className="task-modal-footer" style={{ justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn-secondary" onClick={onClose} disabled={isUploading}>Cancel</button>
          <button className="btn-primary" onClick={handleUpload} disabled={isUploading || !selectedStage || !selectedType}>
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProjectDetails = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [phases, setPhases] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [pagination, setPagination] = useState({
    currentPage: 0,
    pageSize: PAGE_SIZE,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  });
  const prevProjectIdRef = useRef(id);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isHeaderDropdownOpen, setIsHeaderDropdownOpen] = useState(false);

  // Overview Tab State
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState('');
  const [showStageSelector, setShowStageSelector] = useState(false);
  const [showOverviewStatusSelector, setShowOverviewStatusSelector] = useState(false);
  const [showPrioritySelector, setShowPrioritySelector] = useState(false);

  const [selectedTaskForPanel, setSelectedTaskForPanel] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  // Deliverables Tab State
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [substages, setSubstages] = useState({});
  const [completionStatus, setCompletionStatus] = useState({});
  const [expandedSubstageAttachments, setExpandedSubstageAttachments] = useState({}); // { substageId: boolean }

  // Drawings Tab State
  const [attachments, setAttachments] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedUploadFiles, setSelectedUploadFiles] = useState(null);
  const fileInputRef = useRef(null);
  const [drawingsFilterStage, setDrawingsFilterStage] = useState('');
  const [drawingsFilterType, setDrawingsFilterType] = useState('');

  // Column Resizing State
  const [columnWidths, setColumnWidths] = useState({
    name: '1.5fr', // Default flexible width
    assignee: '180px', // Increased from 150px
    dueDate: '120px',
    priority: '100px',
    status: '120px',
    actions: '100px'
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef(null);

  const handleResizeStart = (e, column) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.pageX;
    // Use offsetWidth to get the exact current pixel width, handling both px and fr values correctly
    const startWidth = e.target.parentElement.offsetWidth;

    const handleMouseMove = (moveEvent) => {
      const newWidth = startWidth + (moveEvent.pageX - startX);
      setColumnWidths(prev => ({
        ...prev,
        [column]: `${Math.max(50, newWidth)}px`
      }));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const gridTemplateColumns = `${columnWidths.name} ${columnWidths.assignee} ${columnWidths.dueDate} ${columnWidths.priority} ${columnWidths.status} ${columnWidths.actions}`;

  // Board view states
  const [draggingId, setDraggingId] = useState(null);
  const [newTaskColumn, setNewTaskColumn] = useState(null);
  const [newTaskContent, setNewTaskContent] = useState('');
  const dragItem = useRef();
  const dragNode = useRef();

  const totalTasks = pagination.totalItems ?? tasks.length;
  const isTaskListEmpty = totalTasks === 0;
  const showPagination = !isTaskListEmpty && pagination.totalPages > 1;

  // Check if user has admin role
  const isAdmin = user?.authorities?.some(auth => auth.authority === 'ROLE_ADMIN') || false;

  // Check if user has manager role
  const isManager = () => user?.authorities?.some(auth => auth.authority === 'ROLE_MANAGER') || false;

  const fetchProjectDetails = async (pageToLoad = 0) => {
    try {
      setLoading(true);
      setError('');

      // Fetch project details and team members in parallel
      const [projectResponse, teamResponse] = await Promise.all([
        fetch(`/api/projects/${id}/details?page=${pageToLoad}&size=${PAGE_SIZE}`, { credentials: 'include' }),
        fetch(`/api/projects/${id}/team`, { credentials: 'include' })
      ]);

      if (projectResponse.ok) {
        const data = await projectResponse.json();
        setProject(data.project);
        setPhases(data.phases || []);
        const taskList = data.tasks || [];
        setTasks(taskList);
        const paginationPayload = data.taskPagination || {};
        const normalizedPagination = {
          currentPage: typeof paginationPayload.currentPage === 'number' ? paginationPayload.currentPage : pageToLoad,
          pageSize: typeof paginationPayload.pageSize === 'number' ? paginationPayload.pageSize : PAGE_SIZE,
          totalItems: typeof paginationPayload.totalItems === 'number' ? paginationPayload.totalItems : taskList.length,
          totalPages: typeof paginationPayload.totalPages === 'number' ? paginationPayload.totalPages : (taskList.length > 0 ? 1 : 0),
          hasNext: Boolean(paginationPayload.hasNext),
          hasPrevious: Boolean(paginationPayload.hasPrevious),
        };
        setPagination(normalizedPagination);
        if (normalizedPagination.currentPage !== pageToLoad) {
          setPage(prev => (prev === normalizedPagination.currentPage ? prev : normalizedPagination.currentPage));
        }
      } else {
        if (projectResponse.status === 404) {
          setError('Project not found');
        } else {
          const errorData = await projectResponse.json().catch(() => null);
          setError(errorData?.error || errorData?.message || 'Failed to load project details');
        }
      }

      if (teamResponse.ok) {
        const teamData = await teamResponse.json();
        if (teamData.success && teamData.team) {
          setTeamMembers(teamData.team);
        }
      }

    } catch (error) {
      console.error('Error fetching project details:', error);
      setError('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  // Initial load and refetch when project id or page changes
  useEffect(() => {
    let pageToLoad = page;
    if (prevProjectIdRef.current !== id) {
      prevProjectIdRef.current = id;
      if (page !== 0) {
        setPage(0);
        return;
      }
      pageToLoad = 0;
    }
    fetchProjectDetails(pageToLoad);
  }, [id, page]);

  // Set active tab from location state if available
  useEffect(() => {
    if (location.state && location.state.activeTab) {
      setActiveTab(location.state.activeTab);
      // Clear the state so it doesn't persist on refresh if we don't want it to, 
      // but actually for history navigation it's fine. 
      // However, react-router state persists.
      // We might want to clear it to avoid stuck state, but usually it's fine.
    }
  }, [location.state]);

  // Refetch tasks when switching to the tasks tab
  useEffect(() => {
    if (activeTab === 'tasks' && project && !loading) {
      fetchProjectDetails(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Substages are now included in the phases data from /api/projects/{id}/details
  // Initialize substages and completionStatus state from phases when they load
  useEffect(() => {
    if (phases.length > 0) {
      const substagesMap = {};
      const completionStatusMap = {};
      phases.forEach(phase => {
        substagesMap[phase.id] = phase.substages || [];
        completionStatusMap[phase.id] = phase.completionStatus || { total: 0, completed: 0, percentage: 0, allComplete: false };
      });
      setSubstages(substagesMap);
      setCompletionStatus(completionStatusMap);
    }
  }, [phases]);

  const fetchAttachments = async () => {
    try {
      const response = await fetch(`/api/projects/${id}/attachments`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setAttachments(data);
      }
    } catch (err) {
      console.error("Failed to fetch attachments", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'drawings' && id) {
      fetchAttachments();
    }
  }, [activeTab, id]);

  // Trigger file input click
  const triggerDrawingsInput = () => {
    fileInputRef.current?.click();
  };

  const handleDrawingsFileLocalSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedUploadFiles(e.target.files);
      setShowUploadModal(true);
    }
  };

  const performDrawingsUpload = async (file, stage, drawingType) => {
    const formData = new FormData();
    formData.append('file', file);
    if (stage) formData.append('stage', stage);
    if (drawingType) formData.append('drawingType', drawingType);

    try {
      const response = await fetch(`/api/projects/${id}/attachments`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        console.error("Upload failed for " + file.name);
        // We could bubble error up, but for now console logs are fine as modal handles loading state
      }
    } catch (err) {
      console.error("Upload error", err);
    }
  };

  const onModalUploadComplete = () => {
    setShowUploadModal(false);
    setSelectedUploadFiles(null);
    if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
    fetchAttachments(); // Refresh list
  };

  const handleDownloadAttachment = async (attachmentId) => {
    try {
      const response = await fetch(`/api/projects/${id}/attachments/${attachmentId}/sign-url`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.open(data.url, '_blank');
        } else {
          alert("Download URL not found");
        }
      } else {
        alert("Failed to get download URL");
      }
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  const handleProjectDeleteAttachment = async (attachmentId) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;
    try {
      const response = await fetch(`/api/projects/${id}/attachments/${attachmentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      } else {
        alert("Failed to delete file");
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  // Deliverables Tab Functions
  // Note: fetchPhaseSubstages removed - substages are now included in project details response

  const createDefaultSubstages = async (phaseId) => {
    try {
      const response = await fetch(`/api/phases/${phaseId}/substages/create-defaults`, {
        method: 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Use the substages returned from the create-defaults response
          setSubstages(prev => ({ ...prev, [phaseId]: data.substages || [] }));
          setCompletionStatus(prev => ({ ...prev, [phaseId]: data.completionStatus }));
        }
      }
    } catch (err) {
      console.error('Error creating substages:', err);
    }
  };

  const toggleSubstageComplete = async (phaseId, substageId, isComplete) => {
    try {
      const endpoint = isComplete ? 'incomplete' : 'complete';
      const response = await fetch(`/api/phases/${phaseId}/substages/${substageId}/${endpoint}`, {
        method: 'PUT',
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Normalize the substage response to use 'completed' field (API returns 'isCompleted')
          const normalizedSubstage = {
            ...data.substage,
            completed: data.substage.isCompleted || data.substage.completed
          };
          setSubstages(prev => ({
            ...prev,
            [phaseId]: prev[phaseId].map(s =>
              s.id === substageId ? normalizedSubstage : s
            )
          }));
          setCompletionStatus(prev => ({ ...prev, [phaseId]: data.completionStatus }));
        }
      }
    } catch (err) {
      console.error('Error toggling substage:', err);
    }
  };

  const togglePhaseExpand = (phaseId) => {
    setExpandedPhase(expandedPhase === phaseId ? null : phaseId);
  };

  const toggleSubstageAttachments = (substageId) => {
    setExpandedSubstageAttachments(prev => ({
      ...prev,
      [substageId]: !prev[substageId]
    }));
  };

  const handleFileUpload = (substageId) => {
    // This will mock the click of a hidden file input or just alert for now
    const fileInput = document.getElementById(`file-upload-${substageId}`);
    if (fileInput) fileInput.click();
  };

  const onFileSelected = async (e, phaseId, substageId) => {
    const file = e.target.files[0];
    if (!file) return;

    // UI Only implementation for now
    console.log(`Uploading file ${file.name} to substage ${substageId}`);

    // Simulate optimistic update
    const newAttachment = {
      id: Date.now(),
      name: file.name,
      type: file.name.split('.').pop(),
      size: file.size,
      url: URL.createObjectURL(file), // Temporary local URL
      uploadedBy: user?.name || 'You',
      createdAt: new Date().toISOString()
    };

    setSubstages(prev => ({
      ...prev,
      [phaseId]: prev[phaseId].map(s =>
        s.id === substageId
          ? { ...s, attachments: [...(s.attachments || []), newAttachment] }
          : s
      )
    }));
  };

  const handleDeleteAttachment = (phaseId, substageId, attachmentId) => {
    if (window.confirm('Are you sure you want to remove this attachment?')) {
      setSubstages(prev => ({
        ...prev,
        [phaseId]: prev[phaseId].map(s =>
          s.id === substageId
            ? { ...s, attachments: (s.attachments || []).filter(a => a.id !== attachmentId) }
            : s
        )
      }));
    }
  };

  const getStatusClass = (status) => {
    if (!status) return 'to-do';

    switch (status.toString().toLowerCase()) {
      case 'done':
        return 'done';
      case 'in_progress':
      case 'in progress':
        return 'in-progress';
      case 'in_review':
        return 'in-review';
      case 'on_hold':
        return 'on-hold';
      case 'to_do':
      default:
        return 'to-do';
    }
  };

  const getPriorityClass = (priority) => {
    if (!priority) return 'priority-medium';

    switch (priority.toString().toLowerCase()) {
      case 'high':
        return 'priority-high';
      case 'urgent':
        return 'priority-urgent';
      case 'low':
        return 'priority-low';
      case 'medium':
      default:
        return 'priority-medium';
    }
  };

  const handleDeleteProject = async () => {
    const taskCount = totalTasks;
    let confirmMessage = 'Are you sure you want to delete this project? This action cannot be undone.';

    if (taskCount > 0) {
      confirmMessage = `This project has ${taskCount} task${taskCount > 1 ? 's' : ''}. You cannot delete a project with existing tasks. Please delete or reassign all tasks first, then try again.`;
      alert(confirmMessage);
      return;
    }

    if (window.confirm(confirmMessage)) {
      try {
        const response = await fetch(`/api/projects/${id}/delete`, {
          method: 'POST',
          credentials: 'include'
        });

        if (response.ok) {
          navigate('/projects');
        } else {
          // Try to get the error message from the response
          const errorData = await response.json().catch(() => null);
          const errorMessage = errorData?.error || errorData?.message || 'Failed to delete project';
          setError(errorMessage);
        }
      } catch (error) {
        console.error('Error deleting project:', error);
        setError('Failed to delete project');
      }
    }
  };

  const handleDeleteTask = async (taskId, taskName) => {
    if (window.confirm(`Are you sure you want to delete the task "${taskName}"? This action cannot be undone.`)) {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (response.ok) {
          const isLastItemOnPage = tasks.length === 1;
          const targetPage = isLastItemOnPage && page > 0 ? page - 1 : page;
          if (targetPage === page) {
            fetchProjectDetails(page);
          } else {
            setPage(targetPage);
          }
        } else {
          // Try to get the error message from the response
          const errorData = await response.json().catch(() => null);
          const errorMessage = errorData?.error || errorData?.message || 'Failed to delete task';
          setError(errorMessage);
        }
      } catch (error) {
        console.error('Error deleting task:', error);
        setError('Failed to delete task');
      }
    }
  };

  const canEditTask = (task) => {
    if (!user || !task) return false;

    // User can edit if they are:
    // 1. Assigned to the task
    // 2. Creator of the task  
    // 3. Assigned as checker of the task
    // 4. Admin user
    return (
      (task.assignee && task.assignee.id === user.id) ||
      (task.reporter && task.reporter.id === user.id) ||
      (task.checkedBy && task.checkedBy.id === user.id) ||
      (user.authorities && user.authorities.some(auth => auth.authority === 'ROLE_ADMIN'))
    );
  };

  const goToPreviousPage = () => {
    if (pagination.hasPrevious) {
      setPage(prev => Math.max(prev - 1, 0));
    }
  };

  const goToNextPage = () => {
    if (pagination.hasNext) {
      setPage(prev => prev + 1);
    }
  };

  if (loading && !project) return <ProjectDetailsSkeleton />;
  if (error) return <div className="main-content"><div className="alert alert-danger">{error}</div></div>;
  if (!project) return <div className="main-content">Project not found</div>;

  // Calculate task stats
  const taskStats = {
    total: totalTasks,
    todo: tasks.filter(t => t.status === 'TO_DO').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    inReview: tasks.filter(t => t.status === 'IN_REVIEW').length,
    done: tasks.filter(t => t.status === 'DONE').length
  };

  // Group tasks for Asana view
  const todoTasks = tasks.filter(t => !t.status || t.status === 'TO_DO');
  const doingTasks = tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW');
  const doneTasks = tasks.filter(t => t.status === 'DONE');

  const handleTaskUpdate = async (taskId, updates) => {
    // 1. Optimistic Update
    const previousTasks = [...tasks];
    const previousSelected = selectedTaskForPanel ? { ...selectedTaskForPanel } : null;

    const updatedTasks = tasks.map(t =>
      t.id === taskId ? { ...t, ...updates } : t
    );
    setTasks(updatedTasks);

    // Also update the selected task panel state if it's the one being updated
    if (selectedTaskForPanel && selectedTaskForPanel.id === taskId) {
      setSelectedTaskForPanel(prev => ({ ...prev, ...updates }));
    }

    try {
      // 2. Prepare API Payload
      const apiPayload = { ...updates };

      // Transform assignee object to assigneeId for backend
      if (updates.assignee) {
        apiPayload.assigneeId = updates.assignee.id;
        delete apiPayload.assignee;
      } else if (updates.assignee === null) {
        apiPayload.assigneeId = null;
      }

      // Transform checkedBy object to checkedById for backend
      if (updates.checkedBy) {
        apiPayload.checkedById = updates.checkedBy.id;
        delete apiPayload.checkedBy;
      } else if (updates.checkedBy === null) {
        apiPayload.checkedById = null;
      }

      // Transform phase object to phaseId if present (though usually we pass phaseId directly)
      if (updates.phase) {
        apiPayload.phaseId = updates.phase.id;
        delete apiPayload.phase;
      }

      // 3. API Call
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

    } catch (error) {
      // 4. Rollback on Error
      console.error('Task update failed:', error);
      setTasks(previousTasks);
      if (previousSelected && previousSelected.id === taskId) {
        setSelectedTaskForPanel(previousSelected);
      }
      // Show error toast
      const toast = document.createElement('div');
      toast.className = 'toast-error';
      toast.textContent = 'Failed to update task. Changes reverted.';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  };

  const handleProjectUpdate = async (updates) => {
    // 1. Optimistic Update
    const previousProject = { ...project };
    setProject(prev => ({ ...prev, ...updates }));

    try {
      // 2. Prepare API Payload
      // The project update endpoint expects a DTO, but we can send a partial JSON 
      // if we use the right endpoint or if the backend supports it.
      // My backend endpoint POST /api/projects/{id}/update expects @ModelAttribute (form data) usually?
      // Let's check ProjectController. 
      // It uses @ModelAttribute ProjectUpdateDto. So it expects form-data or query params, NOT JSON body if it's not @RequestBody.
      // Wait, I checked ProjectController earlier.
      // public ResponseEntity<?> updateProject(..., @ModelAttribute("projectUpdateDto") ProjectUpdateDto projectUpdateDto, ...)
      // So I must send FormData.

      const formData = new FormData();
      Object.keys(updates).forEach(key => {
        if (updates[key] !== null && updates[key] !== undefined) {
          formData.append(key, updates[key]);
        }
      });

      const response = await fetch(`/api/projects/${id}/update`, {
        method: 'POST',
        body: formData, // fetch automatically sets Content-Type to multipart/form-data
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

    } catch (error) {
      // 3. Rollback on Error
      console.error('Project update failed:', error);
      setProject(previousProject);

      const toast = document.createElement('div');
      toast.className = 'toast-error';
      toast.textContent = 'Failed to update project. Changes reverted.';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  };

  const handleAddTask = (status) => {
    const tempId = `temp-${Date.now()}`;
    const newTask = {
      id: tempId,
      name: '',
      status: status,
      assignee: null,
      dueDate: null,
      priority: null,
      isTemp: true
    };
    setTasks([...tasks, newTask]);
  };

  const handleCommitTask = async (tempId, taskData) => {
    // Remove temp task if empty name
    if (!taskData.name || !taskData.name.trim()) {
      setTasks(tasks.filter(t => t.id !== tempId));
      return;
    }

    try {
      const response = await fetch(`/api/projects/${id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...taskData,
          projectId: id,
          projectStage: project.projectStage // Pass the project's current stage
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        const savedTask = responseData.task || responseData;
        setTasks(prev => prev.map(t => t.id === tempId ? savedTask : t));
      } else {
        throw new Error('Failed to create task');
      }
    } catch (error) {
      console.error('Task creation failed:', error);
      setTasks(prev => prev.filter(t => t.id !== tempId));
      alert('Failed to create task.');
    }
  };

  // --- Drag and Drop Handlers for Board View ---
  const handleDragStart = (e, { taskId, columnId, index }) => {
    dragItem.current = { taskId, columnId, index };
    dragNode.current = e.target;
    dragNode.current.addEventListener('dragend', handleDragEnd);
    setDraggingId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      if (dragNode.current) dragNode.current.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnter = async (e, targetColumnId) => {
    e.preventDefault();
    if (!dragItem.current || dragItem.current.columnId === targetColumnId) return;

    const currentItem = dragItem.current;
    const task = tasks.find(t => t.id === currentItem.taskId);

    if (!task) return;

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === currentItem.taskId ? { ...t, status: targetColumnId } : t
    ));

    // Update backend
    try {
      await fetch(`/api/tasks/${currentItem.taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetColumnId }),
        credentials: 'include'
      });
    } catch (error) {
      console.error('Failed to update task status:', error);
      // Revert on error
      fetchProjectDetails(page);
    }

    dragItem.current = { ...currentItem, columnId: targetColumnId };
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    if (dragNode.current) {
      dragNode.current.style.opacity = '1';
      dragNode.current.removeEventListener('dragend', handleDragEnd);
    }
    dragItem.current = null;
    dragNode.current = null;
  };

  const handleAddTaskToColumn = async (columnId) => {
    if (!newTaskContent.trim()) {
      setNewTaskColumn(null);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTaskContent,
          status: columnId,
          projectId: id
        }),
        credentials: 'include'
      });

      if (response.ok) {
        const responseData = await response.json();
        const newTask = responseData.task || responseData;
        setTasks(prev => [newTask, ...prev]);
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }

    setNewTaskContent('');
    setNewTaskColumn(null);
  };

  const renderAsanaTaskRow = (task, gridColumns) => (
    <AsanaTaskRow
      key={task.id}
      task={task}
      teamMembers={teamMembers}
      onUpdate={handleTaskUpdate}
      onCommit={handleCommitTask}
      onOpenDetails={() => setSelectedTaskForPanel(task)}
      gridTemplateColumns={gridColumns}
    />
  );



  return (
    <div className="project-details-page fade-in">
      <div className="project-header-modern">
        <div className="project-header-top">
          <div className="project-header-left">
            <div className="project-icon-square">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
            </div>
            <div className="project-title-wrapper">
              <h1 className="project-title-modern">{project.name}</h1>
              <div className="project-status-pill" style={{ cursor: 'pointer', position: 'relative' }} onClick={() => setIsHeaderDropdownOpen(!isHeaderDropdownOpen)}>
                <span className={`status-dot ${project.status === 'ACTIVE' ? 'active' : project.status === 'ON_HOLD' ? 'on-hold' : 'at-risk'}`}></span>
                {project.status?.replace(/_/g, ' ') || 'Active'}
                <ChevronDown size={14} style={{ marginLeft: '6px', opacity: 0.7 }} />

                {isHeaderDropdownOpen && (
                  <div className="asana-dropdown-menu" style={{ top: '100%', left: 0, marginTop: '8px', width: '160px' }}>
                    {PROJECT_STATUSES.map(status => (
                      <div
                        key={status.value}
                        className="asana-dropdown-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProjectUpdate({ status: status.value });
                          setIsHeaderDropdownOpen(false);
                        }}
                      >
                        <span className={`status-dot ${status.value === 'ACTIVE' ? 'active' : status.value === 'ON_HOLD' ? 'on-hold' : 'at-risk'}`}></span>
                        {status.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="header-actions">
            <div className="header-avatars">
              {/* Placeholder for avatars if needed, or just keep actions */}
            </div>
            {isAdmin && (
              <>
                <Link to={`/projects/${id}/edit`} className="btn-customize" title="Edit project">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </Link>
                <button
                  onClick={handleDeleteProject}
                  className="btn-customize"
                  style={{ color: '#ef4444', borderColor: '#ef4444' }}
                  disabled={totalTasks > 0}
                  title={totalTasks > 0 ? `Cannot delete project with ${totalTasks} task${totalTasks > 1 ? 's' : ''}` : "Delete project"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="project-tabs-modern">
          <button
            className={`project-tab-modern ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Layout size={16} />
            Overview
          </button>
          <button
            className={`project-tab-modern ${activeTab === 'drawings' ? 'active' : ''}`}
            onClick={() => setActiveTab('drawings')}
          >
            <File size={16} />
            Drawings
          </button>
          <button
            className={`project-tab-modern ${activeTab === 'deliverables' ? 'active' : ''}`}
            onClick={() => setActiveTab('deliverables')}
          >
            <ClipboardCheck size={16} />
            Deliverables
          </button>
          <button
            className={`project-tab-modern ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            <ListTodo size={16} />
            List
          </button>
          <button
            className={`project-tab-modern ${activeTab === 'board' ? 'active' : ''}`}
            onClick={() => setActiveTab('board')}
          >
            <Kanban size={16} />
            Board
          </button>
          <button
            className={`project-tab-modern ${activeTab === 'contacts' ? 'active' : ''}`}
            onClick={() => setActiveTab('contacts')}
          >
            <Contact size={16} />
            Client Contacts
          </button>
          <button
            className={`project-tab-modern ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
          >
            <Users size={16} />
            Team
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="project-content-area">
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10,
            borderRadius: '12px'
          }}>
            <ProjectDetailsSkeleton activeTab={activeTab} />
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="project-overview-tab">
            <div className="overview-main-section">
              <div className="overview-section-header">
                <h3>Description</h3>
              </div>
              <div className="overview-description">

                {isEditingDescription ? (
                  <textarea
                    className="form-control"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => {
                      setIsEditingDescription(false);
                      if (description !== project.description) {
                        handleProjectUpdate({ description });
                      }
                    }}
                    autoFocus
                    rows={4}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                ) : (
                  <div
                    onClick={() => {
                      setDescription(project.description || '');
                      setIsEditingDescription(true);
                    }}
                    style={{ cursor: 'pointer', minHeight: '2rem' }}
                    title="Click to edit description"
                  >
                    {project.description ? (
                      <p>{project.description}</p>
                    ) : (
                      <p className="text-muted">No description provided. Click to add.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="overview-section-header" style={{ marginTop: '2rem' }}>
                <h3>Project Details</h3>
              </div>
              <div className="overview-details-grid">
                <div className="overview-detail-item">
                  <span className="detail-label">Project Number</span>
                  <span className="detail-value">{project.projectNumber || 'N/A'}</span>
                </div>
                {project.location && (
                  <div className="overview-detail-item">
                    <span className="detail-label">Location</span>
                    <span className="detail-value">{project.location}</span>
                  </div>
                )}
                {project.chargeType && (
                  <div className="overview-detail-item">
                    <span className="detail-label">Charge Type</span>
                    <span className="detail-value">
                      {PROJECT_CHARGE_TYPES.find(t => t.value === project.chargeType)?.label || project.chargeType}
                    </span>
                  </div>
                )}
                <div className="overview-detail-item">
                  <span className="detail-label">Stage</span>
                  <div style={{ position: 'relative' }}>
                    <span
                      className="badge badge-project-stage"
                      style={{ backgroundColor: '#e0f2fe', color: '#0369a1', cursor: 'pointer' }}
                      onClick={() => setShowStageSelector(!showStageSelector)}
                    >
                      {PROJECT_STAGES.find(s => s.value === project.projectStage)?.label || project.projectStage}
                    </span>
                    {showStageSelector && (
                      <div className="asana-dropdown-menu" style={{ top: '100%', left: 0 }}>
                        {PROJECT_STAGES.map(stage => (
                          <div
                            key={stage.value}
                            className="asana-dropdown-item"
                            onClick={() => {
                              handleProjectUpdate({ projectStage: stage.value });
                              setShowStageSelector(false);
                            }}
                          >
                            {stage.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="overview-detail-item">
                  <span className="detail-label">Status</span>
                  <div style={{ position: 'relative' }}>
                    <span
                      className={`badge badge-project-status ${formatStatus(project.status)}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setShowOverviewStatusSelector(!showOverviewStatusSelector)}
                    >
                      {project.status?.replace('_', ' ')}
                    </span>
                    {showOverviewStatusSelector && (
                      <div className="asana-dropdown-menu" style={{ top: '100%', left: 0 }}>
                        {PROJECT_STATUSES.map(status => (
                          <div
                            key={status.value}
                            className="asana-dropdown-item"
                            onClick={() => {
                              handleProjectUpdate({ status: status.value });
                              setShowOverviewStatusSelector(false);
                            }}
                          >
                            <span className={`badge badge-project-status ${formatStatus(status.value)}`}>
                              {status.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="overview-detail-item">
                  <span className="detail-label">Priority</span>
                  <div style={{ position: 'relative' }}>
                    <span
                      className={`badge badge-priority ${formatPriority(project.priority)}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setShowPrioritySelector(!showPrioritySelector)}
                    >
                      {project.priority?.replace('_', ' ')}
                    </span>
                    {showPrioritySelector && (
                      <div className="asana-dropdown-menu" style={{ top: '100%', left: 0 }}>
                        {PROJECT_PRIORITIES.map(p => (
                          <div
                            key={p.value}
                            className="asana-dropdown-item"
                            onClick={() => {
                              handleProjectUpdate({ priority: p.value });
                              setShowPrioritySelector(false);
                            }}
                          >
                            <span className={`badge badge-priority ${formatPriority(p.value)}`}>
                              {p.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {project.projectCategory && (
                  <div className="overview-detail-item">
                    <span className="detail-label">Category</span>
                    <span className="detail-value">{project.projectCategory.replace('_', ' ')}</span>
                  </div>
                )}
                <div className="overview-detail-item">
                  <span className="detail-label">Start Date</span>
                  <span className="detail-value">
                    {project.startDate ? new Date(project.startDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'N/A'}
                  </span>
                </div>
                {project.estimatedEndDate && (
                  <div className="overview-detail-item">
                    <span className="detail-label">Estimated End Date</span>
                    <span className="detail-value">
                      {new Date(project.estimatedEndDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="overview-sidebar-section">
              <div className="overview-section-header">
                <h3>Meta Data</h3>
              </div>
              <div className="overview-meta-list">
                <div className="meta-item">
                  <span className="meta-label">Created on</span>
                  <span className="meta-value">
                    {project.createdAt ? new Date(project.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'N/A'}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Last Updated</span>
                  <span className="meta-value">
                    {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'N/A'}
                  </span>
                </div>
                {isAdmin && (project.budget || project.actualCost) && (
                  <>
                    <div className="sidebar-divider"></div>
                    {project.budget && (
                      <div className="meta-item">
                        <span className="meta-label">Budget</span>
                        <span className="meta-value budget-value">
                          ₹{project.budget.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                    {project.actualCost && (
                      <div className="meta-item">
                        <span className="meta-label">Actual Cost</span>
                        <span className="meta-value cost-value">
                          ₹{project.actualCost.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="project-tasks-tab">


            <div className="asana-task-list" style={{ '--grid-columns': gridTemplateColumns }}>
              <div className="asana-list-header" style={{ gridTemplateColumns }}>
                <div className="header-cell">
                  Name
                  <div className="resize-handle" onMouseDown={(e) => handleResizeStart(e, 'name')} />
                </div>
                <div className="header-cell">
                  Assignee
                  <div className="resize-handle" onMouseDown={(e) => handleResizeStart(e, 'assignee')} />
                </div>
                <div className="header-cell">
                  Due date
                  <div className="resize-handle" onMouseDown={(e) => handleResizeStart(e, 'dueDate')} />
                </div>
                <div className="header-cell">
                  Priority
                  <div className="resize-handle" onMouseDown={(e) => handleResizeStart(e, 'priority')} />
                </div>
                <div className="header-cell">
                  Status
                  <div className="resize-handle" onMouseDown={(e) => handleResizeStart(e, 'status')} />
                </div>
                <div className="header-cell"></div>
              </div>

              <AsanaSection
                title="To do"
                tasks={todoTasks}
                renderRow={(task) => renderAsanaTaskRow(task, gridTemplateColumns)}
                onAddTask={() => handleAddTask('TO_DO')}
                gridTemplateColumns={gridTemplateColumns}
              />
              <AsanaSection
                title="Doing"
                tasks={doingTasks}
                renderRow={(task) => renderAsanaTaskRow(task, gridTemplateColumns)}
                onAddTask={() => handleAddTask('IN_PROGRESS')}
                gridTemplateColumns={gridTemplateColumns}
              />
              <AsanaSection
                title="Done"
                tasks={doneTasks}
                defaultExpanded={false}
                renderRow={(task) => renderAsanaTaskRow(task, gridTemplateColumns)}
                onAddTask={() => handleAddTask('DONE')}
                gridTemplateColumns={gridTemplateColumns}
              />
            </div>
          </div>
        )}



        {/* Team Tab */}
        {activeTab === 'team' && (
          <div className="project-team-tab" style={{ height: '100%' }}>
            <TeamRoster tasks={tasks} project={project} />
          </div>
        )}

        {/* Client Contacts Tab */}
        {activeTab === 'contacts' && (
          <div className="project-contacts-tab" style={{ height: '100%' }}>
            <ClientContacts
              clientId={project.clientId}
              clientName={project.clientName || 'Client'}
            />
          </div>
        )}

        {/* Board Tab */}
        {activeTab === 'board' && (
          <div className="project-tasks-tab">
            <div className="board-view">
              <div className="board-columns">
                {[
                  { id: 'TO_DO', title: 'To Do', status: 'TO_DO' },
                  { id: 'IN_PROGRESS', title: 'In Progress', status: 'IN_PROGRESS' },
                  { id: 'IN_REVIEW', title: 'Review', status: 'IN_REVIEW' },
                  { id: 'DONE', title: 'Done', status: 'DONE' }
                ].map((column) => {
                  const columnTasks = tasks.filter(t => (t.status || 'TO_DO') === column.status);

                  return (
                    <div
                      key={column.id}
                      className="board-column"
                      onDragEnter={(e) => handleDragEnter(e, column.status)}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      <div className="board-column-header">
                        <h2 className="board-column-title">
                          {column.title}
                          <span className="board-column-count">{columnTasks.length}</span>
                        </h2>
                        <div className="board-column-actions">
                          <button onClick={() => setNewTaskColumn(column.id)} className="btn-add-column">
                            <Plus size={16} />
                          </button>
                          <button className="btn-column-menu">
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="board-column-content">
                        {columnTasks.map((task, index) => (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, { taskId: task.id, columnId: column.status, index })}
                            onClick={() => setSelectedTaskForPanel(task)}
                            className={`board-task-card ${draggingId === task.id ? 'dragging' : ''}`}
                          >
                            <div className="task-card-row-1">
                              <div className="task-check-icon">
                                <CheckCircle2 size={18} className="text-gray-400" />
                              </div>
                              <div className="task-card-name">{task.name}</div>
                            </div>

                            <div className="task-card-row-2">
                              <span className={`badge badge-priority ${formatPriority(task.priority)}`}>
                                {task.priority || 'Medium'}
                              </span>
                              <span className={`badge badge-status ${formatStatus(task.status)}`}>
                                {task.status?.replace(/_/g, ' ') || 'To Do'}
                              </span>
                            </div>

                            <div className="task-card-row-3">
                              {task.assignee && (
                                <div className="task-assignee-avatar-small" title={task.assignee.name || task.assignee.username}>
                                  {task.assignee.name ? task.assignee.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                              )}
                              {task.dueDate && (
                                <div className={`task-due-date-text ${new Date(task.dueDate) < new Date() ? 'overdue' : ''}`}>
                                  {new Date(task.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {newTaskColumn === column.id ? (
                          <div className="new-task-card">
                            <textarea
                              autoFocus
                              className="new-task-input"
                              placeholder="What needs to be done?"
                              rows={2}
                              value={newTaskContent}
                              onChange={(e) => setNewTaskContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAddTaskToColumn(column.status);
                                }
                                if (e.key === 'Escape') {
                                  setNewTaskColumn(null);
                                  setNewTaskContent('');
                                }
                              }}
                            />
                            <div className="new-task-actions">
                              <button onClick={() => setNewTaskColumn(null)} className="btn-cancel">Cancel</button>
                              <button onClick={() => handleAddTaskToColumn(column.status)} className="btn-add">Add</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setNewTaskColumn(column.id)} className="btn-add-task">
                            <Plus size={16} />
                            <span>Add task</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}


        {/* Deliverables Tab - Phase Substages Tracking */}
        {activeTab === 'deliverables' && (
          <div style={{ padding: '1rem' }}>
            {phases.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <p>No phases found for this project.</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Create phases in the project to track deliverables.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {phases.map((phase, index) => {
                  const status = completionStatus[phase.id] || {};
                  const phaseSubstages = substages[phase.id] || [];
                  const isExpanded = expandedPhase === phase.id;

                  return (
                    <div
                      key={phase.id}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        background: '#fff',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Phase Header */}
                      <div
                        style={{
                          padding: '0.875rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          background: isExpanded ? '#f8fafc' : '#fff'
                        }}
                        onClick={() => togglePhaseExpand(phase.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <svg
                            width="16" height="16" viewBox="0 0 24 24" fill="none"
                            stroke="#64748b" strokeWidth="2"
                            style={{
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease'
                            }}
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9375rem' }}>
                              {phase.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                              Phase {index + 1}
                            </div>
                          </div>
                        </div>

                        {/* Completion Progress */}
                        {phaseSubstages.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                              width: '100px',
                              height: '6px',
                              background: '#e2e8f0',
                              borderRadius: '3px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                height: '100%',
                                width: `${status.percentage || 0}%`,
                                background: status.allComplete ? '#22c55e' : '#0F172A',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                            <span style={{
                              fontSize: '0.75rem',
                              color: status.allComplete ? '#22c55e' : '#64748b',
                              fontWeight: status.allComplete ? '600' : '400'
                            }}>
                              {status.completed || 0}/{status.total || 0}
                            </span>
                            {status.allComplete && (
                              <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Substages List (Expanded) */}
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid #e2e8f0', padding: '1rem' }}>
                          {phaseSubstages.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '1rem' }}>
                              <p style={{ color: '#64748b', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                                No deliverables defined for this stage.
                              </p>
                              <button
                                onClick={(e) => { e.stopPropagation(); createDefaultSubstages(phase.id); }}
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: '#0F172A',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.8125rem',
                                  fontWeight: '500',
                                  cursor: 'pointer'
                                }}
                              >
                                Add Default Deliverables
                              </button>
                            </div>
                          ) : (
                            <div>
                              <div style={{
                                fontSize: '0.6875rem',
                                fontWeight: '600',
                                color: '#64748b',
                                marginBottom: '0.625rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                Deliverables ({status.completed || 0}/{status.total || 0} Complete)
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                {phaseSubstages.map(substage => (
                                  <label
                                    key={substage.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.75rem',
                                      padding: '0.625rem 0.75rem',
                                      background: substage.completed ? '#f0fdf4' : '#f8fafc',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      transition: 'background 0.2s ease'
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={substage.completed || false}
                                      onChange={() => toggleSubstageComplete(phase.id, substage.id, substage.completed)}
                                      style={{
                                        width: '18px',
                                        height: '18px',
                                        accentColor: '#0F172A',
                                        cursor: 'pointer'
                                      }}
                                    />
                                    <span style={{
                                      flex: 1,
                                      fontSize: '0.875rem',
                                      color: substage.completed ? '#64748b' : '#1e293b',
                                      textDecoration: substage.completed ? 'line-through' : 'none'
                                    }}>
                                      {substage.name}
                                    </span>
                                    {substage.completed && substage.completedByName && (
                                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                        ✓ {substage.completedByName}
                                      </span>
                                    )}
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Drawings Tab */}
        {activeTab === 'drawings' && (
          <div className="project-drawings-tab" style={{ padding: '2rem' }}>

            {/* Header & Upload Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>Drawings & Documents</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Stage Filter */}
                <select
                  value={drawingsFilterStage}
                  onChange={(e) => setDrawingsFilterStage(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.875rem',
                    color: '#334155',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">All Stages</option>
                  {PROJECT_STAGES.map(stage => (
                    <option key={stage.value} value={stage.value}>{stage.label}</option>
                  ))}
                </select>

                {/* Type Filter */}
                <select
                  value={drawingsFilterType}
                  onChange={(e) => setDrawingsFilterType(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.875rem',
                    color: '#334155',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">All Types</option>
                  {DRAWING_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>

                <input
                  type="file"
                  id="project-file-upload"
                  multiple
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleDrawingsFileLocalSelect}
                />
                <button
                  onClick={triggerDrawingsInput}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#0F172A',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  <FileUp size={16} />
                  Upload Files
                </button>
              </div>
            </div>

            {/* File List */}
            {/* Same list code as before */}
            <div className="drawings-list">
              {/* ... */}

              {(() => {
                const filteredAttachments = attachments.filter(file => {
                  if (drawingsFilterStage && file.stage !== drawingsFilterStage) return false;
                  if (drawingsFilterType && file.drawingType !== drawingsFilterType) return false;
                  return true;
                });
                return (
                  <>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', marginBottom: '1rem' }}>
                      All Drawings {filteredAttachments.length > 0 && <span style={{ color: '#94a3b8', fontWeight: 400 }}>({filteredAttachments.length}{attachments.length !== filteredAttachments.length ? ` of ${attachments.length}` : ''})</span>}
                    </h4>

                    {filteredAttachments.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #e2e8f0' }}>
                        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                          <div style={{ width: '48px', height: '48px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <File size={24} color="#cbd5e1" />
                          </div>
                        </div>
                        <p style={{ fontWeight: 500, color: '#64748b' }}>No drawings uploaded yet</p>
                        <p style={{ fontSize: '0.875rem' }}>Upload files to see them here</p>
                      </div>
                    ) : (
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                              <tr>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Name</th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Type</th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Uploaded By</th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Date</th>
                                <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredAttachments.map((file, i) => (
                                <tr key={file.id} style={{ borderBottom: i < filteredAttachments.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                  <td style={{ padding: '12px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <div style={{
                                        width: '32px', height: '32px', borderRadius: '6px', background: '#f1f5f9',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F172A'
                                      }}>
                                        {getDrawingTypeIcon(file.drawingType)}
                                      </div>
                                      <div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>
                                          {file.originalFilename || file.name}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{Math.round(file.size / 1024)} KB</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#64748b' }}>
                                    {file.drawingType ? (DRAWING_TYPES.find(t => t.value === file.drawingType)?.label || file.drawingType) : '-'}
                                  </td>
                                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#64748b' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      {file.uploadedBy && (
                                        <>
                                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e2e8f0', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {file.uploadedBy.name ? file.uploadedBy.name.charAt(0) : '?'}
                                          </div>
                                          {file.uploadedBy.name || 'Unknown'}
                                        </>
                                      )}
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#64748b' }}>
                                    {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : '-'}
                                  </td>
                                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                      <button
                                        onClick={() => handleDownloadAttachment(file.id)}
                                        className="btn-icon-small"
                                        title="Download"
                                        style={{ color: '#64748b' }}
                                      >
                                        <Download size={16} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Invoices Tab */}

      </div>

      {/* Task Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={handleTaskUpdate}
        />
      )}

      {selectedTaskForPanel && (
        <TaskDetailPanel
          task={selectedTaskForPanel}
          onClose={() => setSelectedTaskForPanel(null)}
          onUpdate={handleTaskUpdate}
          teamMembers={teamMembers}
        />
      )}

      {showUploadModal && selectedUploadFiles && (
        <DocumentUploadModal
          files={selectedUploadFiles}
          onClose={onModalUploadComplete}
          onUpload={performDrawingsUpload}
          projectStage={project.projectStage}
        />
      )}
    </div>

  );
};



export default ProjectDetails;
