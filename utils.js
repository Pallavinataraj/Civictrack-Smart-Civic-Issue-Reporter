// CivicTrack Shared Utilities
// Handles storage, report logic, sync

const STORAGE_KEY = 'reports';
const ADMIN_KEY = 'isAdminLoggedIn';

// Get all reports safely
function getReports() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading reports:', e);
    return [];
  }
}

// Save reports safely
function saveReports(reports) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (e) {
    console.error('Error saving reports:', e);
  }
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Auto-detect priority from category
function detectPriority(category) {
  const highPriority = ['Pothole', 'Water Leakage', 'Electricity'];
  const mediumPriority = ['Garbage'];
  
  if (highPriority.some(p => category.includes(p))) return 'High';
  if (mediumPriority.includes(category)) return 'Medium';
  return 'Low';
}

// Reverse geocode lat/lng to readable address (Nominatim API)
async function reverseGeocode(lat, lng) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`);
    const data = await response.json();
    if (data && data.display_name) {
      // Parse approx Place, District, State
      const parts = data.display_name.split(', ').slice(-3); // Last 3 parts approx
      return parts.join(', ');
    }
  } catch (e) {
    console.warn('Reverse geocoding failed:', e);
  }
  // Fallback to legacy
  const hash = Math.floor((lat * 10000 + lng * 10000) % 8);
  const zones = ['City Zone', 'Main Road', 'Residential', 'Park Area', 'Commercial', 'Highway', 'Suburban', 'Market'];
  return zones[hash];
}

// Generate formatted location label
function generateLocationLabel(locationData) {
  if (!locationData) return 'Unknown Location';
  
  if (locationData.locationType === 'manual') {
    return `Manual Entry: ${locationData.placeName || 'N/A'}, ${locationData.district || 'N/A'}, ${locationData.state || 'N/A'}`;
  } else { // live or legacy
    return `Current Location: ${locationData.locationLabel}`;
  }
}

// Legacy compatibility
function getLocationLabel(lat, lng) {
  if (!lat || !lng) return 'Unknown Location';
  const hash = Math.floor((lat * 10000 + lng * 10000) % 8);
  const zones = ['City Zone', 'Main Road', 'Residential', 'Park Area', 'Commercial', 'Highway', 'Suburban', 'Market'];
  return zones[hash];
}

// Create new report object (enhanced location)
async function createReport(category, description, images = [], locationData = null) {
  const id = generateId();
  const priority = detectPriority(category);
  
  let locationLabel = 'Unknown Location';
  let lat = null, lng = null, locationType = null, placeName = null, district = null, state = null;
  
  if (locationData) {
    lat = locationData.latitude;
    lng = locationData.longitude;
    locationType = locationData.locationType;
    placeName = locationData.placeName;
    district = locationData.district;
    state = locationData.state;
    
    // Generate proper label
    if (locationType === 'live' && lat && lng) {
      locationLabel = await reverseGeocode(lat, lng);
    } else {
      locationLabel = generateLocationLabel(locationData);
    }
  } else if (lat && lng) {
    // Legacy call compatibility
    locationLabel = getLocationLabel(lat, lng);
  }
  
  return {
    id,
    category,
    description,
    images,
    latitude: lat,
    longitude: lng,
    locationType,
    placeName,
    district,
    state,
    locationLabel,
    status: 'Pending',
    priority,
    statusHistory: ['Pending'],
    timestamp: Date.now(),
    lastUpdated: Date.now()
  };
}

// Update report status
function updateReportStatus(id, newStatus) {
  const reports = getReports();
  const report = reports.find(r => r.id === id);
  if (report) {
    report.status = newStatus;
    report.statusHistory.push(newStatus);
    report.lastUpdated = Date.now();
    saveReports(reports);
    return true;
  }
  return false;
}

// Delete report
function deleteReport(id) {
  const reports = getReports();
  const initialLength = reports.length;
  const filtered = reports.filter(r => r.id !== id);
  if (filtered.length < initialLength) {
    saveReports(filtered);
    return true;
  }
  return false;
}

// Update report priority
function updateReportPriority(id, newPriority) {
  const reports = getReports();
  const report = reports.find(r => r.id === id);
  if (report) {
    report.priority = newPriority;
    report.lastUpdated = Date.now();
    saveReports(reports);
    return true;
  }
  return false;
}

// Check if admin logged in
function isAdmin() {
  try {
    return localStorage.getItem(ADMIN_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

// Login admin (with cache bust)
function adminLogin() {
  localStorage.setItem(ADMIN_KEY, 'true');
}

// Logout admin
function adminLogout() {
  localStorage.removeItem(ADMIN_KEY);
}

// Status color class (Bootstrap)
function getStatusClass(status) {
  const colors = {
    'Pending': 'warning',
    'Processing': 'info',
    'Completed': 'success',
    'Rejected': 'danger'
  };
  return `badge bg-${colors[status] || 'secondary'}`;
}

// Format timestamp
function formatTimestamp(ts) {
  return new Date(ts).toLocaleString();
}

// Real-time storage sync handler (call on all pages)
function initStorageSync(callback) {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === ADMIN_KEY) {
      callback();
    }
  });
  
  // Fallback polling
  setInterval(callback, 2500);
}

// Export for HTML script use
window.CivicTrackUtils = {
  getReports,
  saveReports,
  createReport,
  updateReportStatus,
  deleteReport,
  updateReportPriority,
  isAdmin,
  adminLogin,
  adminLogout,
  getStatusClass,
  formatTimestamp,
  initStorageSync,
  detectPriority,
  getLocationLabel
};

