import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

const PAGE_SIZE = 12;

const ProjectDetails = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
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

  const totalTasks = pagination.totalItems ?? tasks.length;
  const isTaskListEmpty = totalTasks === 0;
  const showPagination = !isTaskListEmpty && pagination.totalPages > 1;

  // Check if user has admin role
  const isAdmin = user?.authorities?.some(auth => auth.authority === 'ROLE_ADMIN') || false;
  
  // Check if user has manager role
  const isManager = () => user?.authorities?.some(auth => auth.authority === 'ROLE_MANAGER') || false;

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

  const fetchProjectDetails = async (pageToLoad = 0) => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/projects/${id}/details?page=${pageToLoad}&size=${PAGE_SIZE}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
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
        if (response.status === 404) {
          setError('Project not found');
        } else {
          const errorData = await response.json().catch(() => null);
          setError(errorData?.error || errorData?.message || 'Failed to load project details');
        }
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
      setError('Failed to load project details');
    } finally {
      setLoading(false);
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

  if (loading) return <div className="main-content">Loading...</div>;
  if (error) return <div className="main-content"><div className="alert alert-danger">{error}</div></div>;
  if (!project) return <div className="main-content">Project not found</div>;

  return (
    <div className="main-content">
      <div className="back-button-container">
        <Link to="/projects" className="back-button">
          ← Back to Projects
        </Link>
      </div>
      <div className="page-header">
        <h1 className="page-title">{project.name}</h1>
        <div className="page-actions">
          {(isAdmin || isManager()) && (
            <Link to={`/invoices/new?projectId=${id}`} className="btn-primary">
              Create Invoice
            </Link>
          )}
          {isAdmin && (
            <>
              <Link to={`/projects/${id}/edit`} className="btn-secondary">
                Edit Project
              </Link>
              <button 
                onClick={handleDeleteProject}
                className="btn-danger"
                disabled={totalTasks > 0}
                title={totalTasks > 0 ? `Cannot delete project with ${totalTasks} task${totalTasks > 1 ? 's' : ''}. Delete or reassign tasks first.` : "Delete this project permanently"}
              >
                Delete Project
              </button>
            </>
          )}
        </div>
      </div>

      <div className="project-card">
        <div className="project-header">
          <h3>Project Information</h3>
          <span className={`project-status status-${project.status?.toLowerCase().replace(/[ _]/g, '-')}`}>
            {project.status?.replace('_', ' ')}
          </span>
        </div>
        
        <div className="project-info">
          <div className="info-row">
            <span className="info-label">Client Name:</span>
            <span className="info-value">{project.clientName}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Project Category:</span>
            <span className="info-value">{project.projectCategory?.replace('_', ' ')}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Project Priority:</span>
            <span className="info-value">
              <span className={`priority-${project.priority?.toLowerCase()}`}>
                {project.priority?.replace('_', ' ')}
              </span>
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Project Stage:</span>
            <span className="info-value">
              <span className={`stage-${project.projectStage?.toLowerCase().replace(/_/g, '-')}`}>
                {project.projectStage?.displayName || project.projectStage?.replace(/_/g, ' ')}
              </span>
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Location:</span>
            <span className="info-value">{project.location}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Start Date:</span>
            <span className="info-value">{project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}</span>
          </div>
          {project.estimatedEndDate && (
            <div className="info-row">
              <span className="info-label">Estimated End Date:</span>
              <span className="info-value">{new Date(project.estimatedEndDate).toLocaleDateString()}</span>
            </div>
          )}
          {isAdmin && project.budget && (
            <div className="info-row">
              <span className="info-label">Budget:</span>
              <span className="info-value">₹{project.budget.toLocaleString('en-IN')}</span>
            </div>
          )}
          {isAdmin && project.actualCost && (
            <div className="info-row">
              <span className="info-label">Actual Cost:</span>
              <span className="info-value">₹{project.actualCost.toLocaleString('en-IN')}</span>
            </div>
          )}
          {project.createdAt && (
            <div className="info-row">
              <span className="info-label">Created:</span>
              <span className="info-value">{new Date(project.createdAt).toLocaleDateString()}</span>
            </div>
          )}
          {project.updatedAt && (
            <div className="info-row">
              <span className="info-label">Last Updated:</span>
              <span className="info-value">{new Date(project.updatedAt).toLocaleDateString()}</span>
            </div>
          )}
          {project.description && (
            <div className="info-row">
              <span className="info-label">Description:</span>
              <span className="info-value">{project.description}</span>
            </div>
          )}
        </div>
      </div>

      {/* Modern Tasks Section */}
      <div className="modern-tasks-section">
        <div className="tasks-header">
          <h2>Project Tasks ({totalTasks})</h2>
          <Link to={`/projects/${id}/tasks/new`} className="btn-primary btn-add-task">
            + Add New Task
          </Link>
        </div>

        {isTaskListEmpty ? (
          <div className="empty-state">
            <span className="empty-icon">📋</span>
            <h3>No tasks yet</h3>
            <p>This project doesn't have any tasks. Create the first task to get started.</p>
          </div>
        ) : (
          <div className="modern-tasks-grid">
            {tasks.map(task => (
              <div key={task.id} className="modern-task-card-new">
                <div className="task-card-header-new">
                  <div className="task-title-section">
                    <h3 className="task-title-new">
                      <Link to={`/tasks/${task.id}/details`}>
                        {task.name}
                      </Link>
                    </h3>
                    <div className="task-badges-new">
                      <span className={`task-status-new ${getStatusClass(task.status)}`}>
                        {task.status?.replace(/_/g, ' ')}
                      </span>
                      {task.priority && (
                        <span className={`priority-badge-new ${getPriorityClass(task.priority)}`}>
                          {task.priority.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="task-actions-new">
                    <Link to={`/tasks/${task.id}/details`} className="btn-task-action btn-view">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      View
                    </Link>
                    {canEditTask(task) && (
                      <Link to={`/tasks/${task.id}/edit`} className="btn-task-action btn-edit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        Edit
                      </Link>
                    )}
                    <Link to={`/timelogs/task/${task.id}/new`} className="btn-task-action btn-time">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Time
                    </Link>
                    {canEditTask(task) && (
                      <button 
                        onClick={() => handleDeleteTask(task.id, task.name)}
                        className="btn-task-action btn-delete"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2"/>
                          <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="task-card-content-new">
                  {task.description && (
                    <p className="task-description-new">{task.description}</p>
                  )}
                  
                  <div className="task-meta-new">
                    <div className="task-meta-left">
                      {task.project && (
                        <div className="meta-item-new">
                          <div className="meta-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                          </div>
                          <div className="meta-content">
                            <span className="meta-label-new">Project</span>
                            <Link to={`/projects/${task.project.id}/details`} className="meta-value-new project-link-new">
                              {task.project.name}
                            </Link>
                          </div>
                        </div>
                      )}
                      
                      {task.projectStage && (
                        <div className="meta-item-new">
                          <div className="meta-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2"/>
                              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                          </div>
                          <div className="meta-content">
                            <span className="meta-label-new">Stage</span>
                            <span className="meta-value-new">
                              {task.projectStage.replace(/STAGE_\d+_/, '').replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {task.dueDate && (
                        <div className="meta-item-new">
                          <div className="meta-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                              <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                              <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                              <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                          </div>
                          <div className="meta-content">
                            <span className="meta-label-new">Due Date</span>
                            <span className={`meta-value-new due-date-new ${new Date(task.dueDate) < new Date() ? 'overdue' : ''}`}>
                              {new Date(task.dueDate).toLocaleDateString()}
                              {new Date(task.dueDate) < new Date() && (
                                <span className="overdue-indicator">OVERDUE</span>
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="task-meta-right">
                      {task.assignee && (
                        <div className="meta-item-new">
                          <div className="meta-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                              <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                          </div>
                          <div className="meta-content">
                            <span className="meta-label-new">Assigned to</span>
                            <span className="meta-value-new">{task.assignee.name || task.assignee.username}</span>
                          </div>
                        </div>
                      )}
                      
                      {task.checkedBy && (
                        <div className="meta-item-new">
                          <div className="meta-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2"/>
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                          </div>
                          <div className="meta-content">
                            <span className="meta-label-new">Checked by</span>
                            <span className="meta-value-new">{task.checkedBy.name || task.checkedBy.username}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {showPagination && (
          <div className="task-pagination">
            <button 
              type="button"
              className="btn-pagination prev"
              onClick={goToPreviousPage}
              disabled={!pagination.hasPrevious}
            >
              ← Previous
            </button>
            <span className="pagination-status">
              Page {pagination.currentPage + 1} of {pagination.totalPages}
            </span>
            <button 
              type="button"
              className="btn-pagination next"
              onClick={goToNextPage}
              disabled={!pagination.hasNext}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetails;
