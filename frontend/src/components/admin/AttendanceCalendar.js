import React, { useState, useEffect } from 'react';

const AttendanceCalendar = ({ userId }) => {
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  useEffect(() => {
    fetchAttendanceData();
  }, [userId, currentMonth]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportDropdown && !event.target.closest('.export-dropdown-container')) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1; // JavaScript months are 0-indexed
      
      const response = await fetch(`/api/admin/users/${userId}/attendance?year=${year}&month=${month}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAttendanceData(data);
      } else {
        setError('Failed to fetch attendance data');
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      setError('Error fetching attendance data');
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        // Only allow next month if it's not beyond current month
        const nextMonth = new Date(prev);
        nextMonth.setMonth(prev.getMonth() + 1);
        const currentDate = new Date();
        if (nextMonth.getMonth() <= currentDate.getMonth() && nextMonth.getFullYear() <= currentDate.getFullYear()) {
          return nextMonth;
        }
        return prev; // Don't navigate if it would go beyond current month
      }
      return newMonth;
    });
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getAttendanceStatus = (day) => {
    if (!day) return null;
    
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return attendanceData[dateStr] || null;
  };

  const isToday = (day) => {
    if (!day) return false;
    
    const today = new Date();
    const currentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    return today.getDate() === day && 
           today.getMonth() === currentMonth.getMonth() && 
           today.getFullYear() === currentMonth.getFullYear();
  };

  const getAttendanceStats = () => {
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    let presentDays = 0;
    let absentDays = 0;
    let totalWorkingDays = 0;

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.getDate();
    const yesterdayMonth = yesterday.getMonth();
    const yesterdayYear = yesterday.getFullYear();

    // Only calculate stats up to yesterday
    const lastDayToCheck = (currentMonth.getMonth() === yesterdayMonth && currentMonth.getFullYear() === yesterdayYear) 
      ? yesterdayDate 
      : daysInMonth;

    for (let day = 1; day <= lastDayToCheck; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const dayOfWeek = date.getDay();
      
      // Skip only Sunday (Saturday is now a working day)
      if (dayOfWeek !== 0) {
        totalWorkingDays++;
        const status = getAttendanceStatus(day);
        if (status === 'present') {
          presentDays++;
        } else if (status === 'absent') {
          absentDays++;
        }
        // Note: 'no-data' status is not counted in working days stats
      }
    }

    return { presentDays, absentDays, totalWorkingDays };
  };

  const stats = getAttendanceStats();

  const exportAttendanceData = async (format = 'csv') => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      
      const response = await fetch(`/api/admin/users/${userId}/attendance/export?year=${year}&month=${month}`, {
        credentials: 'include'
      });

      if (response.ok) {
        // Get the filename from the response headers
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `attendance_${year}_${String(month).padStart(2, '0')}.csv`;
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }

        const csvContent = await response.text();

        if (format === 'csv') {
          // Download as CSV
          downloadFile(csvContent, filename, 'text/csv');
        } else if (format === 'excel') {
          // Download Excel file from dedicated endpoint
          downloadExcelFile(year, month);
          return; // Exit early since we're making a separate request
        }
        
        setShowExportDropdown(false);
      } else {
        setError('Failed to export attendance data');
      }
    } catch (error) {
      console.error('Error exporting attendance data:', error);
      setError('Error exporting attendance data');
    }
  };


  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const downloadExcelFile = async (year, month) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/attendance/export/excel?year=${year}&month=${month}`, {
        credentials: 'include'
      });

      if (response.ok) {
        // Get the filename from the response headers
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `attendance_${year}_${String(month).padStart(2, '0')}.xlsx`;
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }

        // Create blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        setShowExportDropdown(false);
      } else {
        setError('Failed to export Excel file');
      }
    } catch (error) {
      console.error('Error downloading Excel file:', error);
      setError('Error downloading Excel file');
    }
  };

  if (loading) {
    return (
      <div className="attendance-calendar-loading">
        <div className="loading-spinner"></div>
        <p>Loading attendance data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="attendance-calendar-error">
        <p className="error-text">{error}</p>
        <button onClick={fetchAttendanceData} className="btn-small btn-primary">
          Retry
        </button>
      </div>
    );
  }

  const days = getDaysInMonth(currentMonth);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="attendance-calendar">
      {/* Calendar Header */}
      <div className="calendar-header">
        <div className="calendar-navigation">
          <button 
            onClick={() => navigateMonth('prev')} 
            className="btn-small btn-outline"
          >
            ← Previous
          </button>
          <h4 className="calendar-title">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h4>
          <button 
            onClick={() => navigateMonth('next')} 
            className="btn-small btn-outline"
            disabled={(() => {
              const nextMonth = new Date(currentMonth);
              nextMonth.setMonth(currentMonth.getMonth() + 1);
              const currentDate = new Date();
              return nextMonth.getMonth() > currentDate.getMonth() || nextMonth.getFullYear() > currentDate.getFullYear();
            })()}
          >
            Next →
          </button>
        </div>
        <div className="calendar-actions">
          <div className="export-dropdown-container">
            <button 
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="btn-small btn-primary export-btn"
              title="Export attendance data"
            >
              📊 Export ▼
            </button>
            {showExportDropdown && (
              <div className="export-dropdown">
                <button 
                  onClick={() => exportAttendanceData('csv')}
                  className="export-option"
                  title="Download as CSV file"
                >
                  <span className="export-icon">📄</span>
                  Download CSV
                </button>
                <button 
                  onClick={() => exportAttendanceData('excel')}
                  className="export-option"
                  title="Download as Excel file"
                >
                  <span className="export-icon">📈</span>
                  Download Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Stats */}
      <div className="attendance-stats">
        <div className="stat-item">
          <span className="stat-label">Present:</span>
          <span className="stat-value present">{stats.presentDays}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Absent:</span>
          <span className="stat-value absent">{stats.absentDays}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Working Days:</span>
          <span className="stat-value">{stats.totalWorkingDays}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Attendance Rate:</span>
          <span className="stat-value">
            {stats.totalWorkingDays > 0 ? Math.round((stats.presentDays / stats.totalWorkingDays) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {/* Day headers */}
        {dayNames.map(dayName => (
          <div key={dayName} className="calendar-day-header">
            {dayName}
          </div>
        ))}
        
        {/* Calendar days */}
        {days.map((day, index) => {
          const status = getAttendanceStatus(day);
          const isWeekend = day && new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).getDay() === 0; // Only Sunday is weekend
          const isTodayDate = isToday(day);
          
          return (
            <div 
              key={index} 
              className={`calendar-day ${!day ? 'empty' : ''} ${isWeekend ? 'weekend' : ''} ${status ? `attendance-${status}` : ''} ${isTodayDate ? 'today' : ''}`}
            >
              {day && (
                <>
                  <span className="day-number">{day}</span>
                  {status && (status === 'present' || status === 'absent') && (
                    <div className={`attendance-indicator ${status}`}>
                      {status === 'present' ? '✓' : '✗'}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color present"></div>
          <span>Present</span>
        </div>
        <div className="legend-item">
          <div className="legend-color absent"></div>
          <span>Absent</span>
        </div>
        <div className="legend-item">
          <div className="legend-color today"></div>
          <span>Today</span>
        </div>
        <div className="legend-item">
          <div className="legend-color weekend"></div>
          <span>Weekend</span>
        </div>
        <div className="legend-item">
          <div className="legend-color no-data"></div>
          <span>No Data</span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceCalendar;
