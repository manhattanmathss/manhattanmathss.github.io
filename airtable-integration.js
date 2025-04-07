// Airtable Integration for Student Dashboard

// Global variables for Airtable configuration
let AIRTABLE_API_KEY = 'patiLMV4RhRJT4TxA.b448b6b51b8a26541c54053dd114674a19aacdddbc2dad481b4ee8de88797e45';
let AIRTABLE_BASE_ID = 'appU6ZzVJfd4CqfYu';
let STUDENT_ID = '';
let syncInterval = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check for stored Airtable configuration
    loadAirtableConfig();
    
    // Initialize chart
    initializeChart();
    
    // Add event listeners
    document.getElementById('main-site-link').addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = 'index.html';
    });
});

// Load Airtable configuration from localStorage
function loadAirtableConfig() {
    const config = JSON.parse(localStorage.getItem('airtableConfig') || '{}');
    
    if (config.apiKey && config.baseId) {
        AIRTABLE_API_KEY = config.apiKey;
        AIRTABLE_BASE_ID = config.baseId;
        
        // Set form values if admin modal is open
        const apiKeyInput = document.getElementById('airtable-api-key');
        const baseIdInput = document.getElementById('airtable-base-id');
        
        if (apiKeyInput && baseIdInput) {
            apiKeyInput.value = AIRTABLE_API_KEY;
            baseIdInput.value = AIRTABLE_BASE_ID;
        }
        
        // Check tables configuration
        if (config.tables) {
            const tableCheckboxes = ['students-table', 'sessions-table', 'assignments-table', 'test-results-table', 'resources-table'];
            tableCheckboxes.forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox && config.tables.includes(id)) {
                    checkbox.checked = true;
                }
            });
        }
        
        // Set sync frequency
        if (config.syncFrequency) {
            const syncFrequencySelect = document.getElementById('sync-frequency');
            if (syncFrequencySelect) {
                syncFrequencySelect.value = config.syncFrequency;
            }
            
            // Start auto-sync if enabled
            setupAutoSync(config.syncFrequency);
        }
        
        // Load student ID from localStorage or set default for demo
        STUDENT_ID = localStorage.getItem('studentId') || 'student_001';
        
        // Initialize data if API key and Base ID are set
        initializeDashboard();
    } else {
        // Show configuration message if not set up
        showConfigurationPrompt();
    }
}

// Save Airtable configuration to localStorage
function saveAirtableConfig() {
    const apiKey = document.getElementById('airtable-api-key').value;
    const baseId = document.getElementById('airtable-base-id').value;
    const syncFrequency = document.getElementById('sync-frequency').value;
    
    // Get selected tables
    const selectedTables = [];
    ['students-table', 'sessions-table', 'assignments-table', 'test-results-table', 'resources-table'].forEach(id => {
        if (document.getElementById(id).checked) {
            selectedTables.push(id);
        }
    });
    
    // Save to localStorage
    const config = {
        apiKey,
        baseId,
        tables: selectedTables,
        syncFrequency
    };
    
    localStorage.setItem('airtableConfig', JSON.stringify(config));
    
    // Update global variables
    AIRTABLE_API_KEY = apiKey;
    AIRTABLE_BASE_ID = baseId;
    
    // Setup auto-sync based on selection
    setupAutoSync(syncFrequency);
    
    // Close modal
    toggleAdminModal();
    
    // Initialize dashboard with new config
    initializeDashboard();
    
    // Show success toast
    showToast('Configuration saved successfully');
}

// Show configuration prompt if not set up
function showConfigurationPrompt() {
    // This could be a notification or automatic opening of the admin modal
    const dashboardContent = document.querySelector('main');
    
    if (dashboardContent) {
        dashboardContent.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full p-8">
                <div class="text-center mb-8">
                    <i class="fas fa-database text-blue-900 text-5xl mb-4"></i>
                    <h2 class="text-2xl font-bold text-blue-900 mb-2">Setup Required</h2>
                    <p class="text-gray-600 mb-4">Please configure your Airtable connection to use the dashboard.</p>
                    <button onclick="toggleAdminModal()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                        Configure Airtable Connection
                    </button>
                </div>
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 w-full max-w-2xl">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <i class="fas fa-exclamation-triangle text-yellow-400"></i>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-yellow-700">
                                For demo purposes, you can use any values in the configuration. The dashboard will display sample data.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Initialize the dashboard with data
function initializeDashboard() {
    // Show loading state
    document.getElementById('loading').classList.remove('hidden');
    
    // Load demo data or fetch from Airtable
    if (AIRTABLE_API_KEY && AIRTABLE_BASE_ID) {
        // Set up Axios for Airtable
        axios.defaults.headers.common['Authorization'] = `Bearer ${AIRTABLE_API_KEY}`;
        
        // Fetch real data
        fetchAllData()
            .then(() => {
                // Hide loading indicator
                document.getElementById('loading').classList.add('hidden');
            })
            .catch(error => {
                console.error('Error fetching data from Airtable:', error);
                // Load demo data as fallback
                loadDemoData();
                // Hide loading indicator
                document.getElementById('loading').classList.add('hidden');
                // Show error toast
                showToast('Failed to fetch data from Airtable. Using demo data instead.', 'error');
            });
    } else {
        // Load demo data
        loadDemoData();
        // Hide loading indicator
        document.getElementById('loading').classList.add('hidden');
    }
}

// Fetch all data from Airtable
async function fetchAllData() {
    try {
        // Fetch student data
        const student = await fetchStudentData();
        updateStudentHeader(student);
        
        // Fetch exam data
        const exam = await fetchExamData();
        updateExamCountdown(exam);
        
        // Fetch next session
        const session = await fetchNextSession();
        updateNextSession(session);
        
        // Fetch test results
        const testResults = await fetchTestResults();
        updateProgress(student, testResults);
        updateScoreChart(testResults);
        
        // Fetch assignments
        const assignments = await fetchAssignments();
        updateAssignments(assignments);
        
        // Fetch study plan
        const studyPlan = await fetchStudyPlan();
        updateStudyPlan(studyPlan);
        
        // Fetch resources
        const resources = await fetchResources();
        updateResources(resources);
        
        return true;
    } catch (error) {
        console.error('Error fetching all data:', error);
        throw error;
    }
}

// Fetch student data from Airtable
async function fetchStudentData() {
    try {
        const response = await axios.get(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Students?filterByFormula={StudentID}="${STUDENT_ID}"`
        );
        
        if (response.data.records.length > 0) {
            return response.data.records[0];
        } else {
            throw new Error('Student not found');
        }
    } catch (error) {
        console.error('Error fetching student data:', error);
        return null;
    }
}

// Fetch upcoming exam data
async function fetchExamData() {
    try {
        const response = await axios.get(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Exams?filterByFormula=AND({StudentID}="${STUDENT_ID}", {Date} >= TODAY(), {Status}="Scheduled")&sort[0][field]=Date&sort[0][direction]=asc`
        );
        
        if (response.data.records.length > 0) {
            return response.data.records[0];
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error fetching exam data:', error);
        return null;
    }
}

// Fetch upcoming tutoring sessions
async function fetchNextSession() {
    try {
        const response = await axios.get(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Sessions?filterByFormula=AND({StudentID}="${STUDENT_ID}", {Date} >= TODAY(), {Status}="Scheduled")&sort[0][field]=Date&sort[0][direction]=asc`
        );
        
        if (response.data.records.length > 0) {
            return response.data.records[0];
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error fetching session data:', error);
        return null;
    }
}

// Fetch assignments
async function fetchAssignments() {
    try {
        const response = await axios.get(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Assignments?filterByFormula=AND({StudentID}="${STUDENT_ID}", {Status}="Assigned")&sort[0][field]=DueDate&sort[0][direction]=asc`
        );
        
        return response.data.records;
    } catch (error) {
        console.error('Error fetching assignments:', error);
        return [];
    }
}

// Fetch practice test results
async function fetchTestResults() {
    try {
        const response = await axios.get(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/TestResults?filterByFormula={StudentID}="${STUDENT_ID}"&sort[0][field]=Date&sort[0][direction]=asc`
        );
        
        return response.data.records;
    } catch (error) {
        console.error('Error fetching test results:', error);
        return [];
    }
}

// Fetch weekly study plan
async function fetchStudyPlan() {
    try {
        const response = await axios.get(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/StudyPlan?filterByFormula=AND({StudentID}="${STUDENT_ID}", {Week}="Current")`
        );
        
        if (response.data.records.length > 0) {
            return response.data.records[0];
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error fetching study plan:', error);
        return null;
    }
}

// Fetch resources
async function fetchResources() {
    try {
        const response = await axios.get(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Resources?filterByFormula={StudentID}="${STUDENT_ID}"&sort[0][field]=Priority&sort[0][direction]=asc`
        );
        
        return response.data.records;
    } catch (error) {
        console.error('Error fetching resources:', error);
        return [];
    }
}

// Update student header information
function updateStudentHeader(student) {
    if (!student) return;
    
    document.getElementById('student-name').textContent = student.fields.Name || 'Student Name';
    document.getElementById('student-program').textContent = student.fields.Program || 'Student Program';
    document.getElementById('student-initials').textContent = student.fields.Initials || 'ST';
    
    // Check for notifications
    const notifications = student.fields.NotificationCount || 0;
    const notificationBadge = document.querySelector('.fa-bell + span');
    if (notificationBadge) {
        notificationBadge.textContent = notifications;
        notificationBadge.style.display = notifications > 0 ? 'flex' : 'none';
    }
    
    // Check for unread messages
    const hasUnreadMessages = student.fields.HasUnreadMessages || false;
    const messageIndicator = document.querySelector('.fa-comments .bg-red-500');
    if (messageIndicator) {
        messageIndicator.style.display = hasUnreadMessages ? 'block' : 'none';
    }
}

// Format date for display
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Calculate days remaining until a date
function getDaysRemaining(dateString) {
    const targetDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeDiff = targetDate - today;
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}

// Update exam countdown section
function updateExamCountdown(exam) {
    if (!exam) {
        // Use default/demo data if no exam data
        return;
    }
    
    const examDate = new Date(exam.fields.Date);
    const daysRemaining = getDaysRemaining(examDate);
    
    document.getElementById('exam-date').textContent = formatDate(examDate);
    document.getElementById('exam-location').textContent = `Location: ${exam.fields.Location}`;
    document.getElementById('days-remaining').textContent = daysRemaining;
    
    // Update progress circle
    const totalDays = 100; // For example, assume 100 days of prep time
    const daysCompleted = totalDays - daysRemaining;
    const percentage = Math.min(100, Math.max(0, (daysCompleted / totalDays) * 100));
    const circumference = 251.2; // 2 * Math.PI * 40
    const dashoffset = circumference - (percentage / 100) * circumference;
    
    const progressCircle = document.querySelector('.progress-ring-circle');
    if (progressCircle) {
        progressCircle.style.strokeDashoffset = dashoffset;
    }
}

// Update next tutoring session section
function updateNextSession(session) {
    if (!session) {
        // Use default/demo data if no session data
        return;
    }
    
    const sessionDate = new Date(session.fields.Date);
    const daysUntil = getDaysRemaining(sessionDate);
    
    document.getElementById('session-title').textContent = session.fields.Title;
    document.getElementById('session-tutor').textContent = `Tutor: ${session.fields.Tutor}`;
    document.getElementById('session-time').textContent = session.fields.Time;
    document.getElementById('session-location').textContent = session.fields.Location;
    
    // Set badge
    let badgeText = 'Upcoming';
    if (daysUntil === 0) {
        badgeText = 'Today';
    } else if (daysUntil === 1) {
        badgeText = 'Tomorrow';
    } else if (daysUntil <= 7) {
        badgeText = `In ${daysUntil} days`;
    }
    document.getElementById('session-date-tag').textContent = badgeText;
}

// Update progress section
function updateProgress(student, testResults) {
    if (!student || !testResults || testResults.length === 0) {
        // Use default/demo data if no progress data
        return;
    }
    
    const latestTest = testResults[testResults.length - 1];
    const firstTest = testResults[0];
    
    // Extract scores
    const currentScore = latestTest.fields.TotalScore;
    const startingScore = firstTest.fields.TotalScore;
    const targetScore = student.fields.TargetScore || 1600;
    
    // Calculate progress percentage
    const totalImprovement = targetScore - startingScore;
    const currentImprovement = currentScore - startingScore;
    const progressPercentage = Math.min(100, Math.round((currentImprovement / totalImprovement) * 100));
    
    // Update DOM elements
    document.getElementById('current-score').textContent = currentScore;
    document.getElementById('starting-score').textContent = startingScore;
    document.getElementById('target-score').textContent = targetScore + '+';
    document.getElementById('score-improvement').textContent = `+${currentScore - startingScore} points`;
    document.getElementById('score-progress').style.width = `${progressPercentage}%`;
    
    // Calculate weeks of study
    const firstDate = new Date(firstTest.fields.Date);
    const latestDate = new Date(latestTest.fields.Date);
    const weeksDiff = Math.round((latestDate - firstDate) / (1000 * 60 * 60 * 24 * 7));
    document.getElementById('improvement-period').textContent = `In ${weeksDiff} weeks`;
    
    // Update last updated date
    document.getElementById('last-updated').textContent = `Last updated: ${formatDate(latestTest.fields.Date)}`;
    
    // Update section scores
    document.getElementById('reading-progress').textContent = 
        `${firstTest.fields.ReadingScore} → ${latestTest.fields.ReadingScore}`;
    document.getElementById('writing-progress').textContent = 
        `${firstTest.fields.WritingScore} → ${latestTest.fields.WritingScore}`;
    document.getElementById('math-progress').textContent = 
        `${firstTest.fields.MathScore} → ${latestTest.fields.MathScore}`;
}

// Initialize score chart
function initializeChart() {
    const ctx = document.getElementById('scoreChart').getContext('2d');
    
    window.scoreChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Initial', 'Test 2', 'Test 3', 'Test 4', 'Latest'],
            datasets: [
                {
                    label: 'Total Score',
                    data: [1180, 1220, 1270, 1310, 1340],
                    backgroundColor: 'rgba(30, 64, 175, 0.1)',
                    borderColor: 'rgba(30, 64, 175, 1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            return 'Practice Test ' + (tooltipItems[0].dataIndex + 1);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 1000,
                    max: 1600,
                    ticks: {
                        stepSize: 100
                    }
                }
            }
        }
    });
}

// Update score chart with test result data
function updateScoreChart(testResults) {
    if (!testResults || testResults.length === 0 || !window.scoreChart) {
        return;
    }
    
    const labels = testResults.map((test, index) => `Test ${index + 1}`);
    const scores = testResults.map(test => test.fields.TotalScore);
    
    window.scoreChart.data.labels = labels;
    window.scoreChart.data.datasets[0].data = scores;
    window.scoreChart.update();
}

// Update assignments section
function updateAssignments(assignments) {
    const container = document.getElementById('assignments-container');
    
    if (!container || !assignments || assignments.length === 0) {
        return;
    }
    
    // Clear container
    container.innerHTML = '';
    
    // Add assignments (limit to 3 for dashboard)
    const displayAssignments = assignments.slice(0, 3);
    
    displayAssignments.forEach(assignment => {
        const dueDate = new Date(assignment.fields.DueDate);
        const daysRemaining = getDaysRemaining(dueDate);
        
        // Create status badge class and text
        let badgeClass = 'bg-green-100 text-green-800';
        let badgeText = `Due in ${daysRemaining} days`;
        
        if (daysRemaining <= 1) {
            badgeClass = 'bg-red-100 text-red-800';
            badgeText = daysRemaining === 0 ? 'Due Today' : 'Due Tomorrow';
        } else if (daysRemaining <= 3) {
            badgeClass = 'bg-yellow-100 text-yellow-800';
            badgeText = `Due in ${daysRemaining} days`;
        }
        
        // Create assignment HTML
        const assignmentHTML = `
            <div class="px-6 py-4">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-medium">${assignment.fields.Title}</h3>
                        <p class="text-sm text-gray-500 mt-1">${assignment.fields.Description}</p>
                    </div>
                    <div class="${badgeClass} text-xs font-medium px-2.5 py-0.5 rounded">${badgeText}</div>
                </div>
                <div class="mt-2 flex justify-between items-center">
                    <div class="text-sm text-gray-600">Assigned by: ${assignment.fields.AssignedBy}</div>
                    <button class="text-blue-600 text-sm font-medium hover:underline">Submit Work</button>
                </div>
            </div>
        `;
        
        // Add to container
        container.innerHTML += assignmentHTML;
    });
}

// Update study plan section
function updateStudyPlan(studyPlan) {
    if (!studyPlan) {
        return;
    }
    
    document.getElementById('weekly-focus').textContent = `This Week's Focus: ${studyPlan.fields.Focus}`;
    document.getElementById('focus-description').textContent = studyPlan.fields.Description;
    
    // Update daily schedule if available
    if (studyPlan.fields.Schedule) {
        const scheduleContainer = document.getElementById('weekly-plan-container');
        
        // Try to parse schedule from JSON if it's stored that way
        try {
            const schedule = typeof studyPlan.fields.Schedule === 'string' 
                ? JSON.parse(studyPlan.fields.Schedule) 
                : studyPlan.fields.Schedule;
            
            scheduleContainer.innerHTML = '';
            
            for (const day in schedule) {
                const daySchedule = `
                    <div class="flex">
                        <div class="flex-shrink-0 w-24 font-medium">${day}</div>
                        <div>
                            <div class="font-medium">${schedule[day].title}</div>
                            <div class="text-sm text-gray-500">${schedule[day].description}</div>
                        </div>
                    </div>
                `;
                
                scheduleContainer.innerHTML += daySchedule;
            }
        } catch (error) {
            console.error('Error parsing study plan schedule:', error);
        }
    }
}

// Update resources section
function updateResources(resources) {
    const container = document.getElementById('resources-container');
    
    if (!container || !resources || resources.length === 0) {
        return;
    }
    
    // Clear container
    container.innerHTML = '';
    
    // Add resources (limit to 4 for dashboard)
    const displayResources = resources.slice(0, 4);
    
    displayResources.forEach(resource => {
        const resourceHTML = `
            <div class="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div class="flex-shrink-0">
                    <i class="${getResourceIcon(resource.fields.Type)} text-blue-800 text-lg"></i>
                </div>
                <div class="flex-1">
                    <h3 class="font-medium">${resource.fields.Title}</h3>
                    <p class="text-sm text-gray-500">${resource.fields.Description}</p>
                    <a href="${resource.fields.URL}" target="_blank" class="text-blue-600 text-sm font-medium hover:underline mt-1 inline-block">
                        ${getResourceLinkText(resource.fields.Type)} →
                    </a>
                </div>
            </div>
        `;
        
        container.innerHTML += resourceHTML;
    });
}

// Helper function to get icon for resource type
function getResourceIcon(type) {
    switch (type?.toLowerCase()) {
        case 'video':
            return 'fas fa-video';
        case 'document':
            return 'fas fa-file-pdf';
        case 'practice':
            return 'fas fa-pencil-alt';
        case 'article':
            return 'fas fa-newspaper';
        default:
            return 'fas fa-link';
    }
}

// Helper function to get link text for resource type
function getResourceLinkText(type) {
    switch (type?.toLowerCase()) {
        case 'video':
            return 'Watch video';
        case 'document':
            return 'View document';
        case 'practice':
            return 'Start practice';
        case 'article':
            return 'Read article';
        default:
            return 'Access resource';
    }
}

// Load demo data when Airtable is not configured
function loadDemoData() {
    // Set student info
    updateStudentHeader({
        fields: {
            Name: 'Jason Smith',
            Program: 'SAT Prep Student',
            Initials: 'JS',
            NotificationCount: 2,
            HasUnreadMessages: true
        }
    });
    
    // Initialize the chart with demo data
    initializeChart();
    
    // No need to update other sections as they are pre-populated with demo data in HTML
}

// Function to sync dashboard with Airtable
async function syncWithAirtable() {
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
        showToast('Please configure Airtable API connection first', 'error');
        toggleAdminModal();
        return;
    }
    
    // Show sync animation
    const syncIcon = document.getElementById('sync-icon');
    syncIcon.classList.add('active');
    
    try {
        await fetchAllData();
        showToast('Dashboard synchronized successfully');
    } catch (error) {
        console.error('Sync failed:', error);
        showToast('Synchronization failed. Please check your configuration.', 'error');
    } finally {
        // Stop sync animation
        syncIcon.classList.remove('active');
    }
}

// Set up auto-sync based on frequency selection
function setupAutoSync(frequency) {
    // Clear existing interval
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
    
    // Set up new interval based on frequency
    if (frequency === 'manual') {
        return;
    }
    
    let interval;
    switch (frequency) {
        case '15min':
            interval = 15 * 60 * 1000; // 15 minutes
            break;
        case 'hourly':
            interval = 60 * 60 * 1000; // 1 hour
            break;
        case 'daily':
            interval = 24 * 60 * 60 * 1000; // 24 hours
            break;
        default:
            return;
    }
    
    syncInterval = setInterval(syncWithAirtable, interval);
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    // Set message and style
    toastMessage.textContent = message;
    
    if (type === 'error') {
        toast.classList.remove('bg-blue-600');
        toast.classList.add('bg-red-600');
        document.querySelector('#toast i').className = 'fas fa-exclamation-circle mr-2';
    } else {
        toast.classList.remove('bg-red-600');
        toast.classList.add('bg-blue-600');
        document.querySelector('#toast i').className = 'fas fa-check-circle mr-2';
    }
    
    // Show toast
    toast.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Toggle admin modal
function toggleAdminModal() {
    const modal = document.getElementById('admin-modal');
    modal.classList.toggle('hidden');
}

// Check if user is logged in
function checkLoginStatus() {
    return true; // Always return true for debugging
    // const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    // if (!isLoggedIn) {
        // console.log('User not logged in, redirecting to index.html');
    }
    
    return isLoggedIn;
}

// Handle logging out
function logout() {
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'index.html';
}
